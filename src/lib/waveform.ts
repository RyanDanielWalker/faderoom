// Extract a peak envelope from an AudioBuffer.
// Returns an array of {min, max} per "bucket", where bucket count
// is roughly the target pixel width of the waveform.

export type Peak = { min: number; max: number };

export function extractPeaks(buffer: AudioBuffer, buckets: number): Peak[] {
  // Mix down to mono by averaging channels (cheaper than rendering each channel)
  const channels = buffer.numberOfChannels;
  const samples = buffer.length;
  const samplesPerBucket = Math.floor(samples / buckets);

  const peaks: Peak[] = new Array(buckets);

  // Cache channel data refs outside the inner loop
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buckets; i++) {
    const start = i * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, samples);
    let min = 1;
    let max = -1;

    for (let j = start; j < end; j++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) {
        sum += channelData[c][j];
      }
      const v = sum / channels;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    peaks[i] = { min, max };
  }

  return peaks;
}