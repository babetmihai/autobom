# frozen_string_literal: true

require "cgi"
require "net/http"
require "openssl"
require "securerandom"
require "uri"

module AutobomModelBrowser
  module HttpClient
    module_function

    ALLOWED_EXTENSIONS = %w[.glb .skp .zip].freeze

    # Decoded URI path suffix, e.g. +.glb+ — empty if none (signed URLs often omit extension).
    def extension_from_uri_path(uri)
      path = CGI.unescape(uri.path.to_s)
      File.extname(path).downcase
    rescue ArgumentError
      File.extname(uri.path.to_s).downcase
    end

    def normalize_source(source)
      case source.to_s
      when "sketchup" then "sketchup"
      when "collada" then "collada"
      else "glb"
      end
    end

    def fetch_get(uri, redirect_limit = 5)
      raise "Too many HTTP redirects" if redirect_limit <= 0

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == "https")
      http.verify_mode = OpenSSL::SSL::VERIFY_PEER if http.use_ssl?
      http.open_timeout = 8
      http.read_timeout = 120

      req = Net::HTTP::Get.new(uri.request_uri)
      res = http.request(req)

      if res.is_a?(Net::HTTPRedirection)
        location = res["location"].to_s.strip
        raise "Redirect without location" if location.empty?

        next_uri = URI.parse(location)
        next_uri = uri + location if next_uri.relative?
        return fetch_get(next_uri, redirect_limit - 1)
      end

      res
    end

    def binary_body(res)
      body = res.body
      return "" if body.nil?

      copy = body.dup
      copy.force_encoding(Encoding::BINARY) if copy.respond_to?(:force_encoding)
      copy
    end

    def validate_download_body(body, ext)
      return "The server returned an empty file (HTTP 200). Check the model URL or try again." if body.bytesize == 0

      if ext == ".zip"
        magic = body.byteslice(0, 4)
        unless magic == "PK\x03\x04" || magic == "PK\x05\x06" || magic == "PK\x07\x08"
          preview = body.byteslice(0, 120).to_s
          if preview.include?("<html") || preview.include?("<!DOCTYPE")
            return "The download URL returned HTML instead of a zip bundle. Check modelBundleUrl."
          end
          return "Downloaded file is not a valid zip bundle (missing PK header)."
        end
      end

      nil
    end

    # +source+ is +glb+, +collada+, or +sketchup+.
    def download_to_temp(url, basename, source: "glb")
      uri = URI.parse(url)
      url_ext = extension_from_uri_path(uri)
      source_norm = normalize_source(source)

      if !url_ext.empty? && !ALLOWED_EXTENSIONS.include?(url_ext)
        return {
          ok: false,
          error: "unsupported_format",
          detail: "Only .glb, .skp, and .zip URLs are supported (got #{url_ext}).",
        }
      end

      if url_ext == ".glb" && source_norm != "glb"
        return {
          ok: false,
          error: "source_mismatch",
          detail: "This URL points to a .glb file; use GLB import.",
        }
      end

      if url_ext == ".skp" && source_norm != "sketchup"
        return {
          ok: false,
          error: "source_mismatch",
          detail: "This URL points to an .skp file; use SKP import.",
        }
      end

      if url_ext == ".zip" && source_norm != "collada"
        return {
          ok: false,
          error: "source_mismatch",
          detail: "This URL points to a .zip bundle; use COLLADA import.",
        }
      end

      res = fetch_get(uri)
      unless res.code.to_i == 200
        return { ok: false, error: "http_#{res.code}", body: res.body.to_s[0, 500] }
      end

      body = binary_body(res)
      if body.bytesize == 0
        return {
          ok: false,
          error: "empty_response",
          detail: "The server returned an empty file (HTTP 200). Check the model URL or try again.",
        }
      end

      safe = basename.to_s.gsub(/[^\w.\-]+/, "_")
      ext =
        if ALLOWED_EXTENSIONS.include?(url_ext)
          url_ext
        elsif source_norm == "sketchup"
          ".skp"
        elsif source_norm == "collada"
          ".zip"
        else
          ".glb"
        end

      format_error = validate_download_body(body, ext)
      if format_error
        return { ok: false, error: "invalid_file", detail: format_error }
      end

      stamp = SecureRandom.hex(8)
      path = File.join(Sketchup.temp_dir, "autobom_model_#{safe}_#{stamp}#{ext}")

      File.binwrite(path, body)

      { ok: true, path: path }
    rescue StandardError => e
      { ok: false, error: "download_failed", detail: e.message }
    end
  end
end
