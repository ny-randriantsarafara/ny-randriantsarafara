import path from 'node:path';

import { Font } from '@react-pdf/renderer';

// The geist package does not export its TTF files; `process.cwd()` is `site/` during the build and tests.
const fontDirectory = path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans');

Font.register({
  family: 'Geist',
  fonts: [
    { src: path.join(fontDirectory, 'Geist-Regular.ttf') },
    { src: path.join(fontDirectory, 'Geist-SemiBold.ttf'), fontWeight: 600 },
  ],
});
