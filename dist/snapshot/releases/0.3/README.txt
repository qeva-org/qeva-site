BASELINE EVIDENCE — supplied QEVA 0.3 repository

MANIFEST.sha256 and MANIFEST.sha512 are the original root manifest bytes from the
supplied ZIP. Their relative paths name the original release root, not this directory.
Do not run them against the upgraded release and expect every UI file to match.
INVENTORY.json records every original path, size and digest before modification.
All original archive/objects/*.json are required to retain their original SHA-256.
The full original ZIP remains the user's input; it is not duplicated inside this ZIP.
Current root manifests cover the complete upgraded release including this evidence.
A checksum is fixity evidence, not a signature or a statement of mathematical truth.
