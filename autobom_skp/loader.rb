# frozen_string_literal: true
#
# Dev: HtmlDialog loads ../autobom_ui/dist (after npm run build) or npm run dev; see browser_dialog.rb
# Packaging: ./package-extensions.sh reads AUTOBOM_HTML_DIALOG_URL from repo-root .env (no bundled dist)

require "sketchup.rb"

require File.join(__dir__, "browser_dialog")

module AutobomModelBrowser
  PLUGIN_NAME = "Autobom"
  DEFAULT_API_BASE = "http://127.0.0.1:3847"

  unless file_loaded?(__FILE__)
    menu = UI.menu("Plugins")
    menu.add_item(PLUGIN_NAME) { BrowserDialog.show }

    toolbar = UI::Toolbar.new(PLUGIN_NAME)

    cmd = UI::Command.new(PLUGIN_NAME) { BrowserDialog.show }
    cmd.tooltip = PLUGIN_NAME
    cmd.status_bar_text = "Browse Autobom — import catalog GLB or SKP models"

    icons_dir = File.join(__dir__, "icons")
    small_icon = File.join(icons_dir, "browser_small.png")
    large_icon = File.join(icons_dir, "browser_large.png")

    cmd.small_icon = small_icon
    cmd.large_icon = large_icon

    toolbar.add_item(cmd)

    # No toolbar.show: avoid a new floating strip on every load. If the user left
    # this bar visible last session, restore keeps docked vs floating as they had it.
    tb_visible = defined?(UI::Toolbar::TB_VISIBLE) ? UI::Toolbar::TB_VISIBLE : 1
    if toolbar.get_last_state == tb_visible
      toolbar.restore
    else
      toolbar.hide
    end

    file_loaded(__FILE__)
  end
end
