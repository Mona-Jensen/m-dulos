import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../tools/server.mjs';

test('API distingue puntos originales y polígonos sincronizados', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const statusResponse = await fetch(`${base}/api/catalog/status`);
    assert.equal(statusResponse.status, 200);

    const status = await statusResponse.json();
    assert.equal(status.offlinePoints, 836);
    assert.notEqual(status.kind, 'error');

    const response = await fetch(`${base}/api/catalog/geojson`);
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(data.type, 'FeatureCollection');
    assert.ok(Array.isArray(data.features));

    if (status.kind === 'poligonos' && status.ready) {
      assert.equal(data.sirm.kind, 'poligonos');
      assert.equal(data.features.length, status.receivedCount);
      assert.ok(data.features.length > 0);

      assert.ok(data.features.every(feature =>
        feature.geometry &&
        ['Polygon', 'MultiPolygon'].includes(feature.geometry.type)
      ));
    } else {
      assert.equal(status.kind, 'puntos');
      assert.equal(data.sirm.kind, 'puntos');
      assert.equal(data.features.length, 836);

      assert.ok(data.features.every(feature =>
        feature.geometry?.type === 'Point'
      ));
    }

    assert.equal((await fetch(`${base}/api/catalog/sync`)).status, 405);
    assert.equal((await fetch(`${base}/api/invalid`)).status, 404);

  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
