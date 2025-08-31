/// <reference types="react" />
/// <reference types="react-dom" />

// Ensure JSX namespace exists (workaround for editor parsing issues)
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Minimal fallback types for react-transition-group (if @types not installed)
declare module 'react-transition-group' {
  import * as React from 'react';
  export class CSSTransition extends React.Component<any> {}
  export class SwitchTransition extends React.Component<any> {}
}
