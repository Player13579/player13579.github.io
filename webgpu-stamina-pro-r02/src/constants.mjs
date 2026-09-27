// Generated from design/parameters.json. Run node tools/generate.mjs.
export const PARAMETER_SHA256='9fa289061e99c79adb3071ff92ab68b7abdb8089324338810bbc18619df2ab8c';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export const C=freeze({
  "version": "0.2.0",
  "name": "RESERVE / 受納・蓄勢",
  "defaultDurationMs": 1500,
  "minimumDurationMs": 900,
  "referenceRadius": 82,
  "referenceHeight": 64,
  "inletCount": 2,
  "segments": 48,
  "arrivalWindows": [
    [
      0.24,
      0.59
    ],
    [
      0.31,
      0.68
    ]
  ],
  "morphWindow": [
    0.38,
    0.71
  ],
  "visibilityWindow": [
    0,
    0.07,
    0.9,
    1
  ],
  "reserveHold": [
    0.71,
    0.9
  ],
  "outerSpanPx": 48,
  "intakeHalfWidthPx": 3,
  "reserveHalfWidthPx": 2.35,
  "edgeWidthPx": 0.85,
  "glowScale": 1.72,
  "glowBudget": 0.115,
  "palette": {
    "edge": [
      0.12,
      0.035,
      0.095
    ],
    "body": [
      0.91,
      0.29,
      0.17
    ],
    "hot": [
      1,
      0.76,
      0.54
    ]
  },
  "darkBackground": [
    0.075,
    0.09,
    0.13
  ],
  "lightBackground": [
    0.91,
    0.895,
    0.86
  ],
  "audio": {
    "sampleRate": 48000,
    "attackSeconds": 0.016,
    "cancelReleaseSeconds": 0.008,
    "watchdogSeconds": 0.1,
    "busGain": 0.36,
    "maxVoices": 64
  },
  "nearOverlapDeltaActorMs": 180,
  "approvedForProduction": false,
  "qualityAdopted": false,
  "leadingStart": [
    0.03,
    0.065
  ]
});
