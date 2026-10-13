import './register-geist-fonts.ts';

import { renderToBuffer } from '@react-pdf/renderer';

import { CvDocument } from './cv-document.tsx';

import type { CvModel } from './cv-model.ts';

export async function renderCv(model: CvModel): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<CvDocument model={model} />);
  return new Uint8Array(buffer);
}
