<h1 align="center"><strong><em>Dylan Langston's Github profile</em> 🙋‍♂️</strong></h1>
<a href="https://github.com/dylanlangston/dylanlangston/" title="Dylan Langston's Github profile 🙋‍♂️">
  <p align="center">
    <img src="../dylan.svg" alt="Dylan Langston's Github profile 🙋‍♂️" align="center"></img>
  </p>
</a>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff&style=flat-square"></a>
  <a href="https://github.com/dylanlangston/dylanlangston/actions/workflows/build.yml"><img alt="GitHub Workflow CI/CD" src="https://img.shields.io/github/actions/workflow/status/dylanlangston/dylanlangston/build.yml?label=CI%2FCD&style=flat-square"></a>
  <a href="https://github.com/dylanlangston/dylanlangston/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/dylanlangston/dylanlangston?style=flat-square&label=License"></a>
  <a href="https://api.github.com/repos/dylanlangston/dylanlangston"><img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/dylanlangston/dylanlangston?label=Repo%20Size&style=flat-square"></a>
</p>

### A brief introduction
Hello and welcome! This repository contains the source code used to generate my Github profile readme. The core of this solution lies in using the combination of YAML and Handlebars as templates. The [`./build.ts`](./build.ts) file orchestrates the build process, utilizing [`./library/Builder.ts`](./library/Builder.ts) to generate assets based on templates like [`./templates/dylan.svg.hbs.yaml`](./templates/dylan.svg.hbs.yaml) and [`./templates/readme.md.hbs`](./templates/readme.md.hbs) defined in [`./build-config.json`](./build-config.json). These templates are processed using Handlebars, allowing for population of variables also defined in `./build-config.json`. The novel approach of SVG with YAML markup enhances readability and enables post-processing techniques to optimize the final SVG output.

### Building 🏗️

<table>
  <tr>
    <td>

__Getting the Source Code__
1. Clone the repository: 
    ```
    git clone https://github.com/dylanlangston/dylanlangston.git
    ```
2. Navigate to the project directory:
    ```
    cd dylanlangston
    ```

    </td>
  </tr>
  <tr></tr>
  <tr>
    <td>

__Installing Dependencies__
* Install npm packages:
   ```
   npm install
   ```

    </td>
  </tr>
  <tr></tr>
  <tr>
    <td>

__Building__

* To build the TypeScript app, run the following command:
    ```
    npm run build
    ```

    </td>
  </tr>
  <tr></tr>
  <tr>
    <td>

__Preview__
* To preview the application, run the following command:
    ```
    npm run preview
    ```

    </td>
  </tr>
</table>

### Dev Environment 💻
<table>
  <tr>
    <td colspan="6">
      This repository offers a streamlined development environment setup using a <a href=".devcontainer/devcontainer.json"><code>devcontainer.json</code></a> file, allowing you to get up and running quickly with a fully-featured environment in the cloud.<sup><a href="#local-development" id="fnref-local-development">[1]</a></sup> Use one of the following links to get started:
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <p align="center">
        <a href="https://codespaces.new/dylanlangston/dylanlangston"><img src="https://img.shields.io/static/v1?style=for-the-badge&label=&message=Open+GitHub+Codespaces&color=lightgrey&logo=github" alt="Open in GitHub Codespaces"></a>
      </p>
    </td>
    <td colspan="2">
      <p align="center">
        <a href="https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/dylanlangston/dylanlangston"><img src="https://img.shields.io/static/v1?style=for-the-badge&label=&message=Open+Dev+Container&color=blue&logo=visualstudiocode" alt="Open Dev Container"></a>
      </p>
    </td>
    <td colspan="2">
      <p align="center">
        <a href="https://devpod.sh/open#https://github.com/dylanlangston/dylanlangston"><img src="https://img.shields.io/static/v1?style=for-the-badge&label=&message=Open+DevPod&color=9933CC&logo=devdotto" alt="Open DevPod"></a>
      </p>
    </td>
  </tr>
  <tr>
    <td colspan="6">
      If you want to browse the source code without the need to build, you can do so conveniently on GitHub.dev or VSCode.dev:
    </td>
  </tr>
  <tr>
    <td colspan="3">
      <p align="center">
        <a href="https://github.dev/dylanlangston/dylanlangston"><img src="https://img.shields.io/static/v1?style=for-the-badge&label=&message=View+on+GitHub.dev&color=lightgrey&logo=github" alt="Edit on GitHub.dev"></a>
      </p>
    </td>
    <td colspan="3">
      <p align="center">
        <a href="https://vscode.dev/github/dylanlangston/dylanlangston"><img src="https://img.shields.io/static/v1?style=for-the-badge&label=&message=View+on+VSCode.dev&color=blue&logo=visualstudiocode" alt="Open in vscode.dev"></a>
      </p>
    </td>
  </tr>
</table>
</p>

### Solution Architecture 🏰
```mermaid
graph LR;
    A[./build.ts]
    T[./preview.ts]
    
    A -->|imports| B[./library/Builder.ts]

    S{{"http://localhost:8080/"}}
    T -->|open| S
    J --->|reads| T

    G((build-config.json))
    G -->|reads| B

    G ---|define| I
    G ---|define| H

    B -->|imports| D[./library/SVG.ts]
    subgraph " "
        D -->|imports| N([SVG.js])
        D -->|imports| P([SVGO])
        D -->|imports| O([cssnano])
    end

    B -->|imports| E[./libary/Markdown.ts]
    subgraph " "
        E -->|imports| M([remark])
    end


    subgraph " "
        B -->|imports| K([js-yaml])
        B -->|imports| L([Handlebars.js])
    end
        
    T -->|imports| B

    I[("`./templates`")] -->|reads| B
    H[("`./static`")] -->|reads| B

    B -->|writes| J[("`./out`")]
```

### External Resources ℹ️
Here are some additional resources which are used:
<table>
  <tr>
    <td><a href="https://github.com/cssnano/cssnano">cssnano</a> - Used to optimize the CSS</td>
  </tr>
  <tr>
    <td><a href="https://github.com/handlebars-lang/handlebars.js">Handlebars.js</a> - Used to Populate Templates</td>
  </tr>
  <tr>
    <td><a href="https://github.com/nodeca/js-yaml">js-yaml</a> - Used to read YAML templates</td>
  </tr>
  <tr>
    <td><a href="https://github.com/remarkjs/remark">remark</a> - Used to Optmize Markdown</td>
  </tr>
  <tr>
    <td><a href="https://github.com/svgdotjs/svg.js">SVG.js</a> - Used to generate SVGs</td>
  </tr>
  <tr>
    <td><a href="https://github.com/svg/svgo">SVGO</a> - Used to optimize the SVG</td>
  </tr>
</table>

### License 📜
This tool is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the [`LICENSE`](https://github.com/dylanlangston/dylanlangston/blob/main/LICENSE) file for details.

<h2 id="footer"></h2>
<sub>
<section>
  <ol dir="auto">
    <li id="local-development">
    <p>For local development check out <a href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers">Dev Containers</a> and <a href="https://devpod.sh/">DevPod</a>. <a href="#fnref-local-development" aria-label="Back to reference 1">↩</a></p>
    </li>
  </ol>
</section>
</sub>
