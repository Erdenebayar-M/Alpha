// svgTransformer.js compiles every imported .svg to a react-native-svg component at
// build time. Without this declaration TypeScript (strict) rejects the imports outright.
declare module '*.svg' {
  import type * as React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
