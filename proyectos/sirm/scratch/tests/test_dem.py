import importlib.util
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('import_dem',Path(__file__).resolve().parents[2]/'tools/import-dem.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class ConverterTests(unittest.TestCase):
  def test_ascii_grid_conversion(self):
    with tempfile.TemporaryDirectory() as dirname:
      d=Path(dirname);src=d/'test.asc';dst=d/'result.json'
      src.write_text('ncols 8\nnrows 8\nxllcorner 0\nyllcorner 0\ncellsize 50\nNODATA_value -9999\n'+''.join(' '.join(str(100+c+r) for c in range(8))+'\n' for r in range(8)))
      obj=module.convert(src,dst)
      self.assertEqual(obj['dx'],50);self.assertEqual(obj['rows'],8);self.assertEqual(len(obj['heights']),64)
      self.assertTrue(dst.exists())
  def test_reject_missing_data(self):
    with tempfile.TemporaryDirectory() as dirname:
      d=Path(dirname);src=d/'bad.asc';dst=d/'out.json'
      src.write_text('ncols 8\nnrows 8\nxllcorner 0\nyllcorner 0\ncellsize 50\nNODATA_value -9999\n'+''.join(' '.join('-9999' for _ in range(8))+'\n' for _ in range(8)))
      with self.assertRaises(ValueError):module.convert(src,dst)
  def test_imported_dem_marks_real_terrain(self):
    with tempfile.TemporaryDirectory() as dirname:
      d=Path(dirname);src=d/'test.asc';dst=d/'result.json'
      src.write_text('ncols 8\nnrows 8\nxllcorner 0\nyllcorner 0\ncellsize 10\nNODATA_value -9999\n'+'\n'.join(' '.join(str(100+c+r) for c in range(8)) for r in range(8)))
      obj=module.convert(src,dst)
      self.assertTrue(obj.get('realTerrain') is True)
      self.assertIn('sourceCRS', obj['provenance'])
      self.assertEqual(obj['rows'],8)
      self.assertEqual(obj['cols'],8)
  def test_reject_geographic_crs(self):
    with tempfile.TemporaryDirectory() as dirname:
      d=Path(dirname);src=d/'geo.tif';dst=d/'out.json'
      src.write_bytes(b'not-a-real-geotiff')
      with self.assertRaises((ValueError, RuntimeError)):
        module.parse_geotiff(src)
if __name__=='__main__':unittest.main()
