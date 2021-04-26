<img align="right" alt="traffic" src="https://pv-badge.herokuapp.com/total.svg?repo_id=olavoparno-react-use-scripts"/>

# react-use-scripts

> Appends script tags to the document as functions or components with ease

[![NPM](https://img.shields.io/npm/v/react-use-scripts.svg)](https://www.npmjs.com/package/react-use-scripts)

---

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Documentation](#documentation)
- [License](#license)

---

## Install

```bash
npm install --save react-use-scripts
```

---

## Usage

- react-use-scripts will return a default export _useScript_ and a named export _{ ScriptLoader }_
- Use ScriptLoader as an element in your **JSX** and add optional children and/or fallback rendering

```tsx
import * as React from 'react';
import { ScriptLoader } from 'react-use-scripts';

const App = () => {
  return (
    <ScriptLoader
      id="custom-script-id"
      src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
      delay={500}
      onReady={() => console.log('ready!')}
      onError={(error) => console.log('an error has happened!', error)}
      fallback={(error) => (
        <span>This has errored! {JSON.stringify(error)}</span>
      )}
    >
      <span>Script has loaded succesfully!
    </ScriptLoader>
  );
};
```

- Append scripts to the document programmatically

```tsx
import * as React from 'react';
import useScript from 'react-use-scripts';

const App = () => {
  const [startTrigger, setStartTrigger] = React.useState(false);
  const { ready, error } = useScript({
    src: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
    onReady: () => console.log('ready!'),
    onError: (error) => console.log('an error has happened!', error),
    startTrigger,
  });

  const handleAppendScriptClick = () => {
    setStartTrigger(true);
  };

  return (
    <div>
      <button onClick={handleAppendScriptClick}>
        Click to start appending
      </button>
      {ready && <h1>Script appended to the head programmatically!</h1>}
      {error && <h1>Script has errored! {JSON.stringify(error)}</h1>}
    </div>
  );
};
```

---

## Documentation

1. `ScriptLoader`: **all props** are optional but without either _src_ or _innerText_ this will return `null`;

```tsx
interface IScriptLoaderProps {
  src?: string;
  innerText?: string;
  onReady?: () => void;
  onError?: (error: string | Event) => void;
  otherProps?: THTMLScriptElementProps;
  startTrigger?: boolean;
  id?: string;
  appendTo?: string;
  delay?: number;
  children?:
    | JSX.Element
    | JSX.Element[]
    | string
    | string[]
    | number
    | number[];
  fallback?: (error: string | Event) => JSX.Element;
}
```

2. useScript

```tsx
interface IScriptProps {
  src?: string;
  innerText?: string;
  onReady?: () => void;
  onError?: (error: string | Event) => void;
  otherProps?: THTMLScriptElementProps;
  startTrigger?: boolean;
  id?: string;
  appendTo?: string;
  delay?: number;
}
```

- Default Props:

```tsx
  startTrigger = true,
  id = `react-use-script-${new Date().toISOString()}`,
  appendTo = 'head',
  delay = 0,
```

---

## License

react-use-scripts is [MIT licensed](./LICENSE).

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
