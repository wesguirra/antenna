const { test } = require('node:test');
const assert = require('node:assert/strict');
const utils = import('../src/utils/episodeArtwork.mjs');
test('accepts provider metadata serialized as JSON, relative images and alternate still fields', async () => {
  const { normalizeSeasons, episodeArtwork } = await utils;
  const seasons = normalizeSeasons({2:[{info:JSON.stringify({movie_image:'/images/episode.jpg', still_path:'/still.jpg'})}]});
  assert.equal(seasons[2][0].season, 2);
  assert.equal(seasons[2][0].episode_num, 1);
  assert.deepEqual(episodeArtwork(seasons[2][0], 'https://example.org/poster.jpg', 'https://provider.test'), [
    'https://provider.test/images/episode.jpg', 'https://image.tmdb.org/t/p/w780/still.jpg', 'https://example.org/poster.jpg'
  ]);
});
test('ignores missing or unsafe URLs and deduplicates fallback artwork', async () => {
  const { episodeArtwork } = await utils;
  assert.deepEqual(episodeArtwork({info:{movie_image:'null',image:'javascript:alert(1)',cover:'//images.test/a.jpg'}}, 'https://images.test/a.jpg'), ['https://images.test/a.jpg']);
});
