// Will be deleted soon in favor of OfflineAudioContext

import { BiquadFilter } from "./BiquadFilter"
import { ChartAudio } from "./ChartAudio"

interface Peak {
  position: number
  volume: number
}
interface TempoGuess {
  tempo: number
  count: number
}

export class BPMAnalyzer {
  static testFindBPM(audio: ChartAudio): TempoGuess[] {
    const LOWPASS = new BiquadFilter("lowpass", {
      frequency: 150,
      sampleRate: audio.getSampleRate(),
      bandwidth: 2,
    })
    const HIGHPASS = new BiquadFilter("lowpass", {
      frequency: 100,
      sampleRate: audio.getSampleRate(),
      bandwidth: 2,
    })
    let data = audio.getRawData()[0].map(sample => LOWPASS.process(sample))
    data = data.map(sample => HIGHPASS.process(sample))
    const peaks = this.getPeaks(data, audio.getSampleRate())
    const groups = this.getIntervals(peaks, audio.getSampleRate())
    groups.sort((a, b) => b.count - a.count)
    return groups
  }

  static getPeaks(data: Float32Array, sampleRate: number): Peak[] {
    const partSize = sampleRate / 2
    const parts = data.length / partSize
    let peaks: Peak[] = []
    for (let i = 0; i < parts; i++) {
      let max: Peak | undefined
      for (let j = i * partSize; j < (i + 1) * partSize; j++) {
        const volume = Math.abs(data[j])
        if (!max || volume > max.volume) {
          max = { position: j, volume: volume }
        }
      }
      peaks.push(max!)
    }
    peaks.sort((a, b) => b.volume - a.volume)
    peaks = peaks.splice(0, peaks.length * 0.5)
    peaks.sort((a, b) => a.position - b.position)
    return peaks
  }

  static getIntervals(peaks: Peak[], sampleRate: number): TempoGuess[] {
    const groups: TempoGuess[] = []
    peaks.forEach((peak, index) => {
      for (let i = 1; index + i < peaks.length && i < 10; i++) {
        const group = {
          tempo:
            (60 * sampleRate) / (peaks[index + i].position - peak.position),
          count: 1,
        }
        while (group.tempo < 90) group.tempo *= 2
        while (group.tempo > 180) group.tempo /= 2
        group.tempo = Math.round(group.tempo)
        if (
          !groups.some(interval =>
            interval.tempo === group.tempo ? interval.count++ : 0
          )
        ) {
          groups.push(group)
        }
      }
    })
    return groups
  }
}
