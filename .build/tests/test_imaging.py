"""imaging.py crops, scales and recompresses JPEGs with macOS sips or, elsewhere, ImageMagick.

The sync workflow regenerates images on Ubuntu (ImageMagick) and a Mac does it with sips:
both must do the same crop (centered), the same width and the same quality.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "imaging.py"
spec = importlib.util.spec_from_file_location("imaging", SCRIPT)
imaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imaging)


class Commands(unittest.TestCase):
    def test_sips(self):
        self.assertEqual(imaging.crop_cmd("sips", "a.jpg", 830, 1910),
                         [["sips", "-c", "830", "1910", "a.jpg"]])
        self.assertEqual(imaging.resize_cmd("sips", "a.jpg", "b.jpg", 800, 60),
                         [["sips", "--resampleWidth", "800", "-s", "formatOptions", "60", "a.jpg", "--out", "b.jpg"]])
        self.assertEqual(imaging.recompress_cmd("sips", "a.jpg", 70),
                         [["sips", "-s", "format", "jpeg", "-s", "formatOptions", "70", "a.jpg", "--out", "a.jpg"]])

    def test_imagemagick_does_the_same(self):
        # sips -c crops around the center: ImageMagick needs -gravity center
        self.assertEqual(imaging.crop_cmd("magick", "a.jpg", 830, 1910),
                         [["magick", "a.jpg", "-gravity", "center", "-crop", "1910x830+0+0", "+repage", "a.jpg"]])
        self.assertEqual(imaging.resize_cmd("magick", "a.jpg", "b.jpg", 800, 60),
                         [["magick", "a.jpg", "-resize", "800x", "-quality", "60", "b.jpg"]])
        self.assertEqual(imaging.recompress_cmd("magick", "a.jpg", 70),
                         [["magick", "a.jpg", "-quality", "70", "a.jpg"]])

    def test_imagemagick_6_uses_convert(self):
        self.assertEqual(imaging.resize_cmd("convert", "a.jpg", "b.jpg", 800, 60),
                         [["convert", "a.jpg", "-resize", "800x", "-quality", "60", "b.jpg"]])


class Tool(unittest.TestCase):
    def test_prefers_sips_then_magick_then_convert(self):
        self.assertEqual(imaging.pick_tool(lambda t: t in {"sips", "magick"}), "sips")
        self.assertEqual(imaging.pick_tool(lambda t: t in {"magick", "convert"}), "magick")
        self.assertEqual(imaging.pick_tool(lambda t: t == "convert"), "convert")
        self.assertIsNone(imaging.pick_tool(lambda t: False))


if __name__ == "__main__":
    unittest.main()
