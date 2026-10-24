from pathlib import Path

root = Path(__file__).resolve().parents[1]
required = [
    'settings.gradle',
    'build.gradle',
    'app/build.gradle',
    'app/src/main/AndroidManifest.xml',
    'app/src/main/assets/index.html',
    'app/src/main/java/com/suni/creativestudio/storyhand/MainActivity.java',
    'app/src/main/java/com/suni/creativestudio/storyhand/MusicPlaybackService.java',
]
missing = [p for p in required if not (root / p).is_file()]
for path in missing:
    print('MISSING:', path)
if missing:
    raise SystemExit(1)
print('Required Android project files are present.')
