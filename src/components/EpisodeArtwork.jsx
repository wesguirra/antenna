import React, { useState } from "react";

function Artwork({ candidates, className, fallback }) {
  const [index, setIndex] = useState(0);
  return candidates[index] ? (
    <img src={candidates[index]} className={className} alt="" loading="lazy"
      referrerPolicy="no-referrer" onError={() => setIndex(i => i + 1)} />
  ) : fallback;
}

export default function EpisodeArtwork({ candidates = [], ...props }) {
  const urls = [...new Set(candidates.filter(Boolean))];
  return <Artwork key={JSON.stringify(urls)} candidates={urls} {...props} />;
}
