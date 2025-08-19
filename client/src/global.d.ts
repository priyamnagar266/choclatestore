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
