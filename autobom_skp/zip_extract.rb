# frozen_string_literal: true

require "fileutils"
require "zlib"

module AutobomModelBrowser
  module ZipExtract
    module_function

    LOCAL_HEADER = 0x04034b50
    END_OF_CENTRAL = 0x06054b50
    CENTRAL_HEADER = 0x02014b50

    def extract(zip_path, dest_dir)
      FileUtils.mkdir_p(dest_dir)
      read_entries(zip_path).each do |entry|
        name = entry[:name].to_s.tr("\\", "/")
        next if name.empty? || name.end_with?("/")
        next if name.include?("..")

        out_path = File.join(dest_dir, name)
        FileUtils.mkdir_p(File.dirname(out_path))
        write_entry(zip_path, entry, out_path)
      end
      true
    end

    def read_entries(path)
      data = File.binread(path)
      eocd_offset = find_eocd(data)
      raise "Invalid zip file (missing end-of-central-directory record)" unless eocd_offset

      num_entries = data[eocd_offset + 10, 2].unpack1("v")
      cd_offset = data[eocd_offset + 16, 4].unpack1("V")

      entries = []
      pos = cd_offset
      num_entries.times do
        sig = data[pos, 4].unpack1("V")
        raise "Invalid zip central directory" unless sig == CENTRAL_HEADER

        comp_method = data[pos + 10, 2].unpack1("v")
        comp_size = data[pos + 20, 4].unpack1("V")
        name_len = data[pos + 28, 2].unpack1("v")
        extra_len = data[pos + 30, 2].unpack1("v")
        comment_len = data[pos + 32, 2].unpack1("v")
        local_offset = data[pos + 42, 4].unpack1("V")
        name = data[pos + 46, name_len]

        entries << {
          name: name,
          comp_method: comp_method,
          comp_size: comp_size,
          local_offset: local_offset
        }
        pos += 46 + name_len + extra_len + comment_len
      end
      entries
    end

    def find_eocd(data)
      min_start = [0, data.bytesize - 65_557].max
      (data.bytesize - 22).downto(min_start) do |i|
        return i if data[i, 4].unpack1("V") == END_OF_CENTRAL
      end
      nil
    end

    def write_entry(zip_path, entry, out_path)
      File.open(zip_path, "rb") do |f|
        f.seek(entry[:local_offset])
        raise "Invalid zip local header" unless f.read(4).unpack1("V") == LOCAL_HEADER

        f.read(2) # version needed to extract
        f.read(2) # general purpose bit flag
        comp_method = f.read(2).unpack1("v")
        f.read(2) # last mod file time
        f.read(2) # last mod file date
        f.read(4) # crc-32
        comp_size = f.read(4).unpack1("V")
        f.read(4) # uncompressed size
        name_len = f.read(2).unpack1("v")
        extra_len = f.read(2).unpack1("v")
        f.read(name_len)
        f.read(extra_len)

        comp_size = entry[:comp_size] if comp_size == 0 && entry[:comp_size].to_i > 0

        compressed = f.read(comp_size)
        if compressed.nil? || compressed.bytesize != comp_size
          raise "Truncated zip entry #{entry[:name]}"
        end

        bytes = decompress_entry(compressed, comp_method, entry[:comp_method])
        File.binwrite(out_path, bytes)
      end
    end

    def decompress_entry(compressed, local_method, central_method)
      method = local_method
      method = central_method if method.nil? || method == 0

      case method
      when 0
        compressed
      when 8
        inflate_raw_deflate(compressed)
      else
        raise "Unsupported zip compression method #{method}"
      end
    rescue Zlib::Error => e
      raise "Could not decompress zip entry (#{e.message})"
    end

    # Zip stores raw DEFLATE streams (no zlib wrapper). MAX_WBITS negated skips the wrapper.
    def inflate_raw_deflate(compressed)
      Zlib::Inflate.new(-Zlib::MAX_WBITS).inflate(compressed)
    end
  end
end
