<img
  src={imgSrc}
  alt=""
  onLoad={() => setLoaded(true)}
  onError={() => {
    setImgSrc('/fallback.jpg'); // add a fallback image in public folder
    setLoaded(true);
  }}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: loaded ? 0.8 : 0,
    transition: 'opacity 0.5s',
  }}
/>
