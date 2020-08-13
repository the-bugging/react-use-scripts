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

- Use script tags in your **JSX**

```tsx
import * as React from 'react';
import { useScript } from 'react-use-scripts';

const App = () => {
  const { ScriptLoader } = useScript();

  return (
    <div>
      <ScriptLoader
        id="custom-script"
        src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
        delayMs={0}
        onCreate={() => console.log('created!')}
        type="text/javascript"
      />
    </div>
  );
};
```

- Append scripts to the document programmatically

```tsx
import * as React from 'react';
import { useScript } from 'react-use-scripts';

const App = () => {
  const { appendScript } = useScript();

  React.useEffect(() => {
    appendScript({
      id: 'script-append',
      scriptText: "console.log('my script has been called')",
      optionalCallback: console.log('optional callback'),
    });
  }, [appendScript]);

  return (
    <div>
      <h1>Script appended to the head programmatically!</h1>
    </div>
  );
};
```

---

## Documentation

- `useScript()` returns:

  - ScriptLoader as component
  - Props:

  ```tsx
  type ScriptLoader = {
    onCreate?: (() => null) | undefined; // runs after script tag rendering
    onLoad?: (() => null) | undefined; // runs on script load
    onError?: ((e: any) => never) | undefined; // runs on script error
    delayMs?: number | undefined; // run with delayed start
    htmlPart?: string | undefined; // choose where to append, HEAD or BODY
    src: string; // script file source path
    otherProps?: Record<string, unknown> | undefined; // html script tag properties
  };
  ```

  - Default Props:

  ```tsx
  src: undefined;
  onCreate = () => null;
  onLoad = () => null;
  onError = (e) => {
    throw new URIError(`The script ${e.target.src} is not accessible`);
  };
  delayMs = 0;
  htmlPart = 'head';
  otherProps: undefined;
  ```

  - appendScript()
  - Props:

  ```tsx
  type AppendScript = {
    id: string; // script id
    scriptText: string; // script code as string
    optionalCallback?: (() => null) | undefined; // optional callback function after running
    htmlPart: string; // choose where to append, HEAD or BODY
    otherProps?: Record<string, unknown> | undefined; // html script tag properties
  };
  ```

  - Default Props:

  ```tsx
  id: undefined;
  scriptText: undefined;
  optionalCallback = () => null;
  htmlPart = 'head';
  otherProps = {};
  ```

---

## License

react-use-scripts is [MIT licensed](./LICENSE).

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
