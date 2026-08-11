# frozen_string_literal: true

require "fileutils"
require "json"
require "securerandom"

require File.join(__dir__, "http_client")
require File.join(__dir__, "zip_extract")

_ui_config = File.join(__dir__, "ui_config.rb")
load _ui_config if File.exist?(_ui_config)

module AutobomModelBrowser
  unless const_defined?(:PACKAGED_HTML_DIALOG_URL, false)
    PACKAGED_HTML_DIALOG_URL = nil
  end

  class ModelUsagePushObserver < Sketchup::ModelObserver
    def initialize(dlg)
      @dlg = dlg
      @scheduled = false
    end

    def schedule!
      return if @scheduled
      return unless @dlg.visible?

      @scheduled = true
      UI.start_timer(0.15, false) do
        @scheduled = false
        BrowserDialog.send(:push_document_usage_to_dialog, @dlg) if @dlg.visible?
      rescue StandardError
        @scheduled = false
      end
    end

    def onTransactionCommit(_model)
      schedule!
    end

    def onTransactionUndo(_model)
      schedule!
    end

    def onTransactionRedo(_model)
      schedule!
    end

    def onEraseEntity(_entity)
      schedule!
    end
  end

  module BrowserDialog
    class << self
      ATTR_DICT = "AutobomModelBrowser"
      ATTR_CATALOG_ID = "catalog_id"
      ATTR_SOURCE = "import_source"
      ATTR_IMPORTED_AT = "imported_at"

      # Hash form (not the legacy boolean 2nd arg) + used with DefinitionList#import avoids the
      # interactive place-component path that can destabilize SketchUp 2019-2022 when called from HtmlDialog.
      IMPORT_OPTIONS = { "show_summary" => false }.freeze
      COLLADA_IMPORT_OPTIONS = {
        "show_summary" => false,
        "validate_dae" => true,
        "merge_coplanar_faces" => true
      }.freeze
      # Defer download/import off the HtmlDialog callback stack (prevents SU 2019-2022 crashes).
      IMPORT_TIMER_DELAY = 0.15

      def show
        remote = packaged_html_dialog_url
        index_path = nil
        if remote
          unless remote.match?(/\Ahttps?:\/\//i)
            UI.messagebox("The Autobom UI URL is invalid (must start with http:// or https://).")
            return
          end
        else
          index_path = resolve_model_browser_index_path
          unless index_path
            UI.messagebox(
              "The model browser UI is missing.\n\n" \
              "Development: build autobom_ui (e.g. npm run build --prefix autobom_ui) or use the dev server URL in ui_config.rb.\n\n" \
              "Packaged .rbz builds always use a hosted URL (set AUTOBOM_HTML_DIALOG_URL in repo-root .env when packaging)."
            )
            return
          end
        end

        dlg = UI::HtmlDialog.new(
          dialog_title: PLUGIN_NAME,
          preferences_key: "com.autobom.model_browser",
          scrollable: true,
          resizable: true,
          width: 560,
          height: 520,
          style: UI::HtmlDialog::STYLE_DIALOG
        )

        register_dialog_callbacks(dlg)

        if remote
          dlg.set_url(cache_busted_url(remote))
        elsif dlg.respond_to?(:set_file)
          dlg.set_file(index_path)
        else
          dlg.set_url(file_url_for(index_path))
        end
        dlg.show

        attach_usage_observer(dlg)
        push_environment_to_dialog(dlg)
        push_document_usage_to_dialog(dlg)
      end

      private

      def packaged_html_dialog_url
        u = AutobomModelBrowser::PACKAGED_HTML_DIALOG_URL
        return nil unless u

        s = u.to_s.strip
        s.empty? ? nil : s
      end

      # SketchUp HtmlDialog (CEF) aggressively caches remote URLs — bust on each open.
      def cache_busted_url(url)
        sep = url.include?("?") ? "&" : "?"
        "#{url}#{sep}_cb=#{Time.now.to_i}"
      end

      # Optional local fallback: web/dist next to this file; dev repo uses ../autobom_ui/dist. Packaged installs use AUTOBOM_HTML_DIALOG_URL.
      def resolve_model_browser_index_path
        [
          File.join(__dir__, "web", "dist", "index.html"),
          File.join(__dir__, "..", "autobom_ui", "dist", "index.html"),
        ].map { |p| File.expand_path(p) }.find { |p| File.exist?(p) }
      end

      def register_dialog_callbacks(dlg)
        dlg.add_action_callback("get_document_usage") do |_ctx, _arg|
          push_document_usage_to_dialog(dlg)
        end

        dlg.add_action_callback("get_environment") do |_ctx, _arg|
          push_environment_to_dialog(dlg)
        end

        dlg.add_action_callback("show_message") do |_ctx, text|
          msg = text.to_s.strip
          UI.messagebox(msg) unless msg.empty?
        end

        dlg.add_action_callback("import_model") do |_ctx, json|
          handle_import_model(dlg, json)
        end
      end

      def attach_usage_observer(dlg)
        observed = Sketchup.active_model
        usage_observer = ModelUsagePushObserver.new(dlg)
        observed.add_observer(usage_observer)
        return unless dlg.respond_to?(:set_on_closed)

        dlg.set_on_closed do
          observed.remove_observer(usage_observer)
        rescue StandardError
          # ignore
        end
      end

      def notify_import_done(dlg, ok, catalog_id, message = nil, response_mode = "import")
        return unless dlg.visible?

        mode_norm = response_mode.to_s.strip
        mode_norm = "import" if mode_norm.empty?
        payload = { "ok" => ok, "id" => catalog_id.to_s, "mode" => mode_norm }
        payload["message"] = message if message
        dlg.execute_script("window.__importDone(#{payload.to_json})")
      rescue StandardError
        # ignore notify failures (e.g. dialog closed)
      end

      def js_import_mode(import_mode)
        import_mode == :component ? "component" : "import"
      end

      def handle_import_model(dlg, json)
        payload = parse_import_payload(json)
        unless payload
          notify_import_done(dlg, false, "", "Invalid import payload.", "import")
          return
        end

        UI.start_timer(IMPORT_TIMER_DELAY, false) do
          run_deferred_import(dlg, payload)
        rescue StandardError => e
          notify_import_done(
            dlg,
            false,
            payload["id"].to_s,
            "Import error: #{e.message}",
            js_import_mode(payload[:import_mode])
          )
        end
      end

      def parse_import_payload(json)
        h = JSON.parse(json)
        catalog_id = h["id"].to_s
        model_url = h["model_url"].to_s
        return nil if model_url.empty?

        import_mode = h["mode"].to_s == "component" ? :component : :import
        source = HttpClient.normalize_source(h["source"])
        {
          "id" => catalog_id,
          "model_url" => model_url,
          "source" => source,
          import_mode: import_mode
        }
      rescue JSON::ParserError
        nil
      end

      def run_deferred_import(dlg, payload)
        catalog_id = payload["id"].to_s
        model_url = payload["model_url"].to_s
        source = payload["source"]
        import_mode = payload[:import_mode]
        response_mode = js_import_mode(import_mode)

        if source == "glb" && !glb_native_import?
          msg = glb_unsupported_message
          notify_import_done(dlg, false, catalog_id, msg, response_mode)
          return
        end

        dl = HttpClient.download_to_temp(
          model_url,
          catalog_id.empty? ? "model" : catalog_id,
          source: source
        )
        unless dl[:ok]
          detail = dl[:detail].to_s.strip
          err_for_js =
            if !detail.empty?
              detail
            else
              "Download failed."
            end
          notify_import_done(dlg, false, catalog_id, err_for_js, response_mode)
          return
        end

        import_path = nil
        extract_dir = nil

        begin
          if source == "collada"
            prep = prepare_collada_import(dl[:path], catalog_id)
            unless prep[:ok]
              notify_import_done(dlg, false, catalog_id, prep[:error].to_s, response_mode)
              return
            end
            import_path = prep[:path]
            extract_dir = prep[:extract_dir]
          else
            import_path = stage_import_file(dl[:path], catalog_id)
          end

          model = Sketchup.active_model
          ok = false
          error_msg = nil
          op_label = import_mode == :component ? "Add catalog model as component" : "Import remote model"

          model.start_operation(op_label, true)
          begin
            ok, error_msg = add_as_catalog_component!(model, import_path, catalog_id)
          rescue StandardError => e
            error_msg = "#{import_mode == :component ? 'Component' : 'Import'} error: #{e.message}"
            ok = false
          ensure
            if ok
              model.commit_operation
            else
              model.abort_operation
            end
          end
        ensure
          cleanup_import_file(import_path) unless extract_dir
          cleanup_extract_dir(extract_dir)
        end

        push_document_usage_to_dialog(dlg)
        notify_import_done(dlg, ok, catalog_id, error_msg, response_mode)
      end

      def cleanup_extract_dir(dir)
        return unless dir && !dir.to_s.empty?

        FileUtils.rm_rf(dir) if File.directory?(dir)
      rescue StandardError
        # ignore temp cleanup failures
      end

      def prepare_collada_import(download_path, catalog_id)
        safe = catalog_id.to_s.gsub(/[^\w.\-]+/, "_")
        safe = "model" if safe.empty?
        extract_dir = File.join(
          Sketchup.temp_dir,
          "autobom_bundle_#{safe}_#{SecureRandom.hex(8)}"
        )

        begin
          ZipExtract.extract(download_path, extract_dir)
        rescue StandardError => e
          cleanup_extract_dir(extract_dir)
          cleanup_import_file(download_path)
          return { ok: false, error: "Could not extract COLLADA bundle: #{e.message}" }
        end

        cleanup_import_file(download_path)

        dae_path = find_dae_file(extract_dir)
        unless dae_path
          cleanup_extract_dir(extract_dir)
          return { ok: false, error: "No .dae file found in the COLLADA bundle." }
        end

        { ok: true, path: dae_path, extract_dir: extract_dir }
      end

      def find_dae_file(dir)
        preferred = File.join(dir, "model.dae")
        return preferred if File.file?(preferred)

        Dir.glob(File.join(dir, "**", "*.dae")).find do |path|
          File.file?(path)
        end
      end

      def stage_import_file(download_path, catalog_id)
        safe = catalog_id.to_s.gsub(/[^\w.\-]+/, "_")
        safe = "model" if safe.empty?
        ext = File.extname(download_path)
        import_path = File.join(
          Sketchup.temp_dir,
          "autobom_import_#{safe}_#{SecureRandom.hex(8)}#{ext}"
        )
        FileUtils.cp(download_path, import_path)
        cleanup_import_file(download_path)
        import_path
      end

      def cleanup_import_file(path)
        return unless path && !path.to_s.empty?

        File.delete(path) if File.exist?(path)
      rescue StandardError
        # ignore temp cleanup failures
      end

      def stamp_catalog!(entity, catalog_id)
        cid = catalog_id.to_s
        return if cid.empty?

        entity.set_attribute(ATTR_DICT, ATTR_CATALOG_ID, cid)
        entity.set_attribute(ATTR_DICT, ATTR_SOURCE, "autobom_skp")
        entity.set_attribute(ATTR_DICT, ATTR_IMPORTED_AT, Time.now.to_i)
      rescue StandardError
        # ignore
      end

      # Same Autobom attrs on the definition so instances placed from the Components panel
      # (no instance-level attributes) still match the BOM.
      def stamp_catalog_definition!(definition, catalog_id)
        return unless definition.is_a?(Sketchup::ComponentDefinition)
        return unless definition.valid?

        stamp_catalog!(definition, catalog_id)
      rescue StandardError
        # ignore
      end

      def set_import_display_name!(entity, catalog_id)
        return unless entity.respond_to?(:name=)

        entity.name = "Autobom: #{catalog_id}"
      rescue StandardError
        # ignore
      end

      def catalog_id_for_root_entity(entity)
        return nil unless entity.valid? && entity.respond_to?(:get_attribute)

        cid = entity.get_attribute(ATTR_DICT, ATTR_CATALOG_ID)
        return cid.to_s if cid && !cid.to_s.empty?

        if entity.is_a?(Sketchup::ComponentInstance)
          defn = entity.definition
          if defn && defn.valid?
            cid = defn.get_attribute(ATTR_DICT, ATTR_CATALOG_ID)
            return cid.to_s if cid && !cid.to_s.empty?

            # Legacy: definition named by the plugin before attributes were stored on the definition.
            name = defn.name.to_s.strip
            if (m = name.match(/\AAutobom:\s*(.+)\z/i))
              id = m[1].to_s.strip
              return id unless id.empty?
            end
          end
        end

        nil
      end

      def count_tagged_catalog_roots(model)
        counts = Hash.new(0)
        walk = lambda do |entities|
          entities.each do |e|
            next unless e.valid?

            cid = catalog_id_for_root_entity(e)
            if cid && !cid.empty?
              counts[cid] += 1
              next
            end

            walk.call(e.entities) if e.is_a?(Sketchup::Group)
            walk.call(e.definition.entities) if e.is_a?(Sketchup::ComponentInstance)
          end
        end
        walk.call(model.entities)
        counts
      end

      def push_document_usage_to_dialog(dlg)
        return unless dlg.visible?

        model = Sketchup.active_model
        payload = {
          tagged_instances: count_tagged_catalog_roots(model),
        }
        dlg.execute_script("window.__documentUsage(#{payload.to_json})")
      rescue StandardError
        # ignore
      end

      def push_environment_to_dialog(dlg)
        return unless dlg.visible?

        payload = {
          sketchup_version: sketchup_major_version,
          glb_native_import: glb_native_import?,
        }
        dlg.execute_script("window.__sketchupEnv(#{payload.to_json})")
      rescue StandardError
        # ignore
      end

      # Native glTF/GLB import shipped in SketchUp 2025 (version 25.x).
      def sketchup_major_version
        Sketchup.version.to_s.split(".").first.to_i
      rescue StandardError
        0
      end

      def glb_native_import?
        sketchup_major_version >= 25
      end

      def glb_unsupported_message
        year = sketchup_major_version
        year = "your" if year <= 0
        "GLB import requires SketchUp 2025 or newer.\n\n" \
          "SketchUp #{year} cannot import GLB files."
      end

      def finish_catalog_component_instance!(instance, catalog_id)
        cid = catalog_id.to_s
        return if cid.empty?
        return unless instance.is_a?(Sketchup::ComponentInstance) && instance.valid?

        stamp_catalog!(instance, cid)
        set_import_display_name!(instance, cid)
        defn = instance.definition
        if defn && defn.valid?
          stamp_catalog_definition!(defn, cid)
          defn.name = "Autobom: #{cid}" if defn.respond_to?(:name=)
        end
      rescue StandardError
        # ignore
      end

      def load_skp_definition(model, path)
        # allow_newer added in SketchUp 2021.0; omit keyword on older builds.
        if Sketchup.version.split(".").first.to_i >= 21
          model.definitions.load(path, allow_newer: true)
        else
          model.definitions.load(path)
        end
      end

      # .skp uses definitions.load(allow_newer: true) so SKPs saved in a newer SU build can load in 2021+
      # (Ruby API requires explicit opt-in; some info may be stripped). GLB and DAE use DefinitionList#import
      # (not Model#import) so SketchUp does not enter the interactive place-component path
      # (problematic from HtmlDialog on SU 2019–2022).
      def import_dae_as_definition(model, path)
        abs_path = File.expand_path(path)
        return nil unless File.file?(abs_path) && File.readable?(abs_path)

        model.definitions.import(abs_path, COLLADA_IMPORT_OPTIONS)
      rescue StandardError
        begin
          model.definitions.import(abs_path, IMPORT_OPTIONS)
        rescue StandardError
          nil
        end
      end

      def dae_import_failure_message(path)
        file_size = File.size(path) rescue 0
        "SketchUp could not import the Collada file (#{file_size} bytes). " \
          "Verify the bundle contains model.dae and texture images in the same folder."
      end

      def import_glb_as_definition(model, path)
        model.definitions.import(path, IMPORT_OPTIONS)
      rescue StandardError
        nil
      end

      def glb_import_failure_message(path)
        file_size = File.size(path) rescue 0
        if !glb_native_import?
          return glb_unsupported_message
        end
        "SketchUp could not import the GLB (#{file_size} bytes). Verify the file."
      end

      def place_imported_definition_as_component!(model, definition, catalog_id, transformation = nil)
        tr = transformation || Geom::Transformation.new
        instance = model.active_entities.add_instance(definition, tr)
        return [false, "Could not place imported model."] unless instance.is_a?(Sketchup::ComponentInstance) && instance.valid?

        finish_catalog_component_instance!(instance, catalog_id)
        [true, nil]
      end

      def add_as_catalog_component!(model, path, catalog_id)
        unless File.exist?(path) && File.size(path) > 0
          return [false, "Downloaded file is empty or missing: #{path}"]
        end

        ext = File.extname(path).downcase

        case ext
        when ".skp"
          begin
            definition = load_skp_definition(model, path)
            if definition
              instance = model.active_entities.add_instance(definition, Geom::Transformation.new)
              finish_catalog_component_instance!(instance, catalog_id)
              return [true, nil]
            end
          rescue StandardError => e
            return [false, "Could not open SketchUp model (.skp): #{e.message}"]
          end
          [false, "Could not open SketchUp model (.skp)."]
        when ".glb"
          definition = import_glb_as_definition(model, path)
          return [false, glb_import_failure_message(path)] unless definition&.valid?

          place_imported_definition_as_component!(model, definition, catalog_id)
        when ".dae"
          definition = import_dae_as_definition(model, path)
          return [false, dae_import_failure_message(path)] unless definition&.valid?

          place_imported_definition_as_component!(model, definition, catalog_id)
        else
          [false, "Unsupported file type (expected .glb, .dae, .skp, or .zip bundle): #{ext}"]
        end
      end

      # Fallback only if HtmlDialog lacks #set_file. Encode spaces for valid file:// URLs.
      def file_url_for(abs_path)
        normalized = abs_path.tr("\\", "/")
        encoded = normalized.gsub(" ", "%20")
        if Sketchup.platform == :platform_win
          "file:///#{encoded}"
        else
          "file://#{encoded}"
        end
      end
    end
  end
end
