export type TargetKind = 'dir' | 'file'

export interface TargetRule {
  id: string
  label: string
  match: string
  kind: TargetKind
  hint: string
  caution?: string
  defaultEnabled?: boolean
}

export interface CategoryRule {
  id: string
  label: string
  indicators: string[]
  global?: boolean
  accent: string
  targets: TargetRule[]
}

export const CATEGORIES: CategoryRule[] = [
  {
    id: 'node',
    label: 'Node.js / Web',
    indicators: ['package.json'],
    accent: '#6ee7a8',
    targets: [
      { id: 'node_modules', label: 'node_modules', match: 'node_modules', kind: 'dir', hint: 'Installed packages. Restored by npm install.' },
      { id: 'dist', label: 'dist', match: 'dist', kind: 'dir', hint: 'Bundler output.' },
      { id: 'build', label: 'build', match: 'build', kind: 'dir', hint: 'Build output.', caution: 'Electron Builder and some other tools use build/ for source assets such as icons and installer scripts rather than output.' },
      { id: 'next', label: '.next', match: '.next', kind: 'dir', hint: 'Next.js build cache and output.' },
      { id: 'nuxt', label: '.nuxt', match: '.nuxt', kind: 'dir', hint: 'Nuxt build output.' },
      { id: 'output', label: '.output', match: '.output', kind: 'dir', hint: 'Nitro and Nuxt 3 production output.' },
      { id: 'svelte-kit', label: '.svelte-kit', match: '.svelte-kit', kind: 'dir', hint: 'SvelteKit generated files.' },
      { id: 'astro', label: '.astro', match: '.astro', kind: 'dir', hint: 'Astro generated types and cache.' },
      { id: 'angular', label: '.angular', match: '.angular', kind: 'dir', hint: 'Angular CLI build cache.' },
      { id: 'expo', label: '.expo', match: '.expo', kind: 'dir', hint: 'Expo local cache.' },
      { id: 'vite', label: '.vite', match: '.vite', kind: 'dir', hint: 'Vite dependency cache.' },
      { id: 'turbo', label: '.turbo', match: '.turbo', kind: 'dir', hint: 'Turborepo task cache and logs.' },
      { id: 'parcel-cache', label: '.parcel-cache', match: '.parcel-cache', kind: 'dir', hint: 'Parcel build cache.' },
      { id: 'cache', label: '.cache', match: '.cache', kind: 'dir', hint: 'Bundler cache used by Gatsby and others.' },
      { id: 'storybook-static', label: 'storybook-static', match: 'storybook-static', kind: 'dir', hint: 'Built Storybook site.' },
      { id: 'coverage', label: 'coverage', match: 'coverage', kind: 'dir', hint: 'Test coverage report.' },
      { id: 'nyc-output', label: '.nyc_output', match: '.nyc_output', kind: 'dir', hint: 'Raw nyc coverage data.' },
      { id: 'eslintcache', label: '.eslintcache', match: '.eslintcache', kind: 'file', hint: 'ESLint result cache.' }
    ]
  },
  {
    id: 'python',
    label: 'Python',
    indicators: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'],
    accent: '#ffd43b',
    targets: [
      { id: 'venv-dot', label: '.venv', match: '.venv', kind: 'dir', hint: 'Virtual environment. Recreated by python -m venv.' },
      { id: 'venv', label: 'venv', match: 'venv', kind: 'dir', hint: 'Virtual environment. Recreated by python -m venv.' },
      { id: 'env', label: 'env', match: 'env', kind: 'dir', hint: 'Virtual environment in a folder named env.', caution: 'Some projects use env/ for configuration or fixtures rather than a virtual environment.' },
      { id: 'pycache', label: '__pycache__', match: '__pycache__', kind: 'dir', hint: 'Compiled bytecode.' },
      { id: 'pytest-cache', label: '.pytest_cache', match: '.pytest_cache', kind: 'dir', hint: 'pytest run cache.' },
      { id: 'mypy-cache', label: '.mypy_cache', match: '.mypy_cache', kind: 'dir', hint: 'mypy type-check cache.' },
      { id: 'ruff-cache', label: '.ruff_cache', match: '.ruff_cache', kind: 'dir', hint: 'Ruff lint cache.' },
      { id: 'tox', label: '.tox', match: '.tox', kind: 'dir', hint: 'tox environments.' },
      { id: 'ipynb-checkpoints', label: '.ipynb_checkpoints', match: '.ipynb_checkpoints', kind: 'dir', hint: 'Jupyter notebook autosaves.' },
      { id: 'htmlcov', label: 'htmlcov', match: 'htmlcov', kind: 'dir', hint: 'HTML coverage report.' },
      { id: 'py-build', label: 'build', match: 'build', kind: 'dir', hint: 'setuptools build directory.' },
      { id: 'py-dist', label: 'dist', match: 'dist', kind: 'dir', hint: 'Built wheels and source distributions.' }
    ]
  },
  {
    id: 'android',
    label: 'Android / Gradle',
    indicators: ['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'],
    accent: '#8bc34a',
    targets: [
      { id: 'build', label: 'build', match: 'build', kind: 'dir', hint: 'Gradle module output.' },
      { id: 'app-build', label: 'app/build', match: 'app/build', kind: 'dir', hint: 'Output of the app module.' },
      { id: 'app-debug', label: 'app/debug', match: 'app/debug', kind: 'dir', hint: 'Debug APKs written beside the app module.' },
      { id: 'app-release', label: 'app/release', match: 'app/release', kind: 'dir', hint: 'Signed release APK or AAB.', caution: 'This can be the exact artifact you shipped or uploaded. Gradle does not put it back until you build and sign again.' },
      { id: 'gradle', label: '.gradle', match: '.gradle', kind: 'dir', hint: 'Project-local Gradle cache and daemon state.' },
      { id: 'kotlin', label: '.kotlin', match: '.kotlin', kind: 'dir', hint: 'Kotlin compiler session data.' },
      { id: 'cxx', label: '.cxx', match: '.cxx', kind: 'dir', hint: 'NDK build intermediates.' },
      { id: 'captures', label: 'captures', match: 'captures', kind: 'dir', hint: 'Profiler captures recorded by Android Studio.', caution: 'These are recordings you took by hand. Nothing regenerates them.', defaultEnabled: false }
    ]
  },
  {
    id: 'dotnet',
    label: '.NET / C#',
    indicators: ['*.sln', '*.csproj', '*.fsproj', '*.vbproj'],
    accent: '#a78bfa',
    targets: [
      { id: 'bin', label: 'bin', match: 'bin', kind: 'dir', hint: 'Compiled assemblies.' },
      { id: 'obj', label: 'obj', match: 'obj', kind: 'dir', hint: 'Build intermediates.' },
      { id: 'test-results', label: 'TestResults', match: 'TestResults', kind: 'dir', hint: 'Test run output and coverage files.' }
    ]
  },
  {
    id: 'maven',
    label: 'Java (Maven)',
    indicators: ['pom.xml'],
    accent: '#f06292',
    targets: [
      { id: 'target', label: 'target', match: 'target', kind: 'dir', hint: 'Maven build output.' }
    ]
  },
  {
    id: 'go',
    label: 'Go',
    indicators: ['go.mod'],
    accent: '#00add8',
    targets: [
      { id: 'vendor', label: 'vendor', match: 'vendor', kind: 'dir', hint: 'Vendored modules. Restored by go mod vendor.', caution: 'Builds run with -mod=vendor need this directory present, and an offline build cannot restore it.' }
    ]
  },
  {
    id: 'rust',
    label: 'Rust',
    indicators: ['Cargo.toml'],
    accent: '#ff8f5e',
    targets: [
      { id: 'target', label: 'target', match: 'target', kind: 'dir', hint: 'Cargo build output.' }
    ]
  },
  {
    id: 'cpp',
    label: 'C / C++ (CMake)',
    indicators: ['CMakeLists.txt'],
    accent: '#f34b7d',
    targets: [
      { id: 'build', label: 'build', match: 'build', kind: 'dir', hint: 'CMake build tree.' },
      { id: 'cmake-debug', label: 'cmake-build-debug', match: 'cmake-build-debug', kind: 'dir', hint: 'CLion debug build tree.' },
      { id: 'cmake-release', label: 'cmake-build-release', match: 'cmake-build-release', kind: 'dir', hint: 'CLion release build tree.' },
      { id: 'cmake-files', label: 'CMakeFiles', match: 'CMakeFiles', kind: 'dir', hint: 'CMake generator scratch files.' }
    ]
  },
  {
    id: 'php',
    label: 'PHP',
    indicators: ['composer.json'],
    accent: '#8892be',
    targets: [
      { id: 'vendor', label: 'vendor', match: 'vendor', kind: 'dir', hint: 'Composer packages. Restored by composer install.' },
      { id: 'var-cache', label: 'var/cache', match: 'var/cache', kind: 'dir', hint: 'Symfony compiled container and cache.' },
      { id: 'bootstrap-cache', label: 'bootstrap/cache', match: 'bootstrap/cache', kind: 'dir', hint: 'Laravel compiled service and package manifests.', caution: 'Laravel needs this directory to exist. Recreate it after cleaning, or artisan refuses to run.' }
    ]
  },
  {
    id: 'ios',
    label: 'iOS / Xcode',
    indicators: ['Podfile', '*.xcodeproj', '*.xcworkspace'],
    accent: '#7aa2ff',
    targets: [
      { id: 'pods', label: 'Pods', match: 'Pods', kind: 'dir', hint: 'CocoaPods sources. Restored by pod install.' },
      { id: 'derived-data', label: 'DerivedData', match: 'DerivedData', kind: 'dir', hint: 'Xcode build intermediates and index.' },
      { id: 'build', label: 'build', match: 'build', kind: 'dir', hint: 'Xcode build output.' },
      { id: 'symlinks', label: '.symlinks', match: '.symlinks', kind: 'dir', hint: 'Plugin symlinks created by CocoaPods.' }
    ]
  },
  {
    id: 'flutter',
    label: 'Flutter / Dart',
    indicators: ['pubspec.yaml'],
    accent: '#54c5f8',
    targets: [
      { id: 'dart_tool', label: '.dart_tool', match: '.dart_tool', kind: 'dir', hint: 'Dart tooling cache and generated package config.' },
      { id: 'build', label: 'build', match: 'build', kind: 'dir', hint: 'Flutter build output.' },
      { id: 'pub-cache', label: '.pub-cache', match: '.pub-cache', kind: 'dir', hint: 'Project-local pub package cache.', caution: 'Shared by every project that points at it. Removing it forces a full re-download.' }
    ]
  },
  {
    id: 'ruby',
    label: 'Ruby',
    indicators: ['Gemfile'],
    accent: '#e0575b',
    targets: [
      { id: 'vendor-bundle', label: 'vendor/bundle', match: 'vendor/bundle', kind: 'dir', hint: 'Bundler gems. Restored by bundle install.' },
      { id: 'tmp-cache', label: 'tmp/cache', match: 'tmp/cache', kind: 'dir', hint: 'Rails asset and bootsnap cache.' }
    ]
  },
  {
    id: 'unity',
    label: 'Unity',
    indicators: ['Assembly-CSharp.csproj', 'ProjectVersion.txt'],
    accent: '#cfd4da',
    targets: [
      { id: 'library', label: 'Library', match: 'Library', kind: 'dir', hint: 'Imported asset database and caches. Unity rebuilds it on next open.' },
      { id: 'temp', label: 'Temp', match: 'Temp', kind: 'dir', hint: 'Scratch files from the running editor.' },
      { id: 'obj', label: 'Obj', match: 'Obj', kind: 'dir', hint: 'Script compilation intermediates.' },
      { id: 'logs', label: 'Logs', match: 'Logs', kind: 'dir', hint: 'Editor and package manager logs.' },
      { id: 'builds', label: 'Builds', match: 'Builds', kind: 'dir', hint: 'Exported player builds.', caution: 'These are finished game builds, not intermediates. Nothing regenerates them until you export again.' }
    ]
  },
  {
    id: 'unreal',
    label: 'Unreal Engine',
    indicators: ['*.uproject'],
    accent: '#a1887f',
    targets: [
      { id: 'binaries', label: 'Binaries', match: 'Binaries', kind: 'dir', hint: 'Compiled module binaries.' },
      { id: 'intermediate', label: 'Intermediate', match: 'Intermediate', kind: 'dir', hint: 'Build intermediates and generated headers.' },
      { id: 'ddc', label: 'DerivedDataCache', match: 'DerivedDataCache', kind: 'dir', hint: 'Cooked shader and asset cache.' },
      { id: 'saved', label: 'Saved', match: 'Saved', kind: 'dir', hint: 'Logs, autosaves, crash reports and local config.', caution: 'Autosaves and local editor config live here alongside the logs.', defaultEnabled: false }
    ]
  },
  {
    id: 'swift',
    label: 'Swift Package',
    indicators: ['Package.swift'],
    accent: '#f0813a',
    targets: [
      { id: 'build', label: '.build', match: '.build', kind: 'dir', hint: 'Swift Package Manager build output.' },
      { id: 'swiftpm', label: '.swiftpm', match: '.swiftpm', kind: 'dir', hint: 'Package scheme and workspace state.', caution: 'Holds Xcode schemes for the package, which are not always committed.', defaultEnabled: false }
    ]
  },
  {
    id: 'terraform',
    label: 'Terraform',
    indicators: ['.terraform.lock.hcl', '*.tf'],
    accent: '#844fba',
    targets: [
      { id: 'terraform', label: '.terraform', match: '.terraform', kind: 'dir', hint: 'Downloaded providers and modules. Restored by terraform init.' }
    ]
  },
  {
    id: 'elixir',
    label: 'Elixir',
    indicators: ['mix.exs'],
    accent: '#c792ea',
    targets: [
      { id: 'build', label: '_build', match: '_build', kind: 'dir', hint: 'Compiled beam files per environment.' },
      { id: 'deps', label: 'deps', match: 'deps', kind: 'dir', hint: 'Fetched dependencies. Restored by mix deps.get.' }
    ]
  },
  {
    id: 'godot',
    label: 'Godot',
    indicators: ['project.godot'],
    accent: '#478cbf',
    targets: [
      { id: 'godot', label: '.godot', match: '.godot', kind: 'dir', hint: 'Godot 4 import cache and editor metadata.' },
      { id: 'import', label: '.import', match: '.import', kind: 'dir', hint: 'Godot 3 import cache.' }
    ]
  },
  {
    id: 'haskell',
    label: 'Haskell',
    indicators: ['stack.yaml', '*.cabal'],
    accent: '#7e57c2',
    targets: [
      { id: 'stack-work', label: '.stack-work', match: '.stack-work', kind: 'dir', hint: 'Stack build output.' },
      { id: 'dist-newstyle', label: 'dist-newstyle', match: 'dist-newstyle', kind: 'dir', hint: 'cabal v2 build output.' }
    ]
  },
  {
    id: 'zig',
    label: 'Zig',
    indicators: ['build.zig'],
    accent: '#f7a41d',
    targets: [
      { id: 'zig-cache-dot', label: '.zig-cache', match: '.zig-cache', kind: 'dir', hint: 'Zig build cache.' },
      { id: 'zig-cache', label: 'zig-cache', match: 'zig-cache', kind: 'dir', hint: 'Zig build cache from older releases.' },
      { id: 'zig-out', label: 'zig-out', match: 'zig-out', kind: 'dir', hint: 'Zig install output.' }
    ]
  },
  {
    id: 'ide',
    label: 'IDE / Editor',
    indicators: [
      '.idea',
      '.vs',
      '.vscode',
      '.vscode-test',
      '.history',
      '.metals',
      '.bloop',
      '.bsp',
      '.ccls-cache',
      '.qtc_clangd',
      '.sonarlint',
      '.ionide',
      '.fleet'
    ],
    accent: '#e879f9',
    targets: [
      { id: 'idea', label: '.idea', match: '.idea', kind: 'dir', hint: 'IntelliJ, Android Studio and other JetBrains project settings.', caution: 'Holds run configurations, code style and other local IDE state that is often not committed.', defaultEnabled: false },
      { id: 'vs', label: '.vs', match: '.vs', kind: 'dir', hint: 'Visual Studio local state and index.', caution: 'Holds window layout, breakpoints and the symbol index, which Visual Studio rebuilds slowly.', defaultEnabled: false },
      { id: 'fleet', label: '.fleet', match: '.fleet', kind: 'dir', hint: 'JetBrains Fleet workspace state.', caution: 'Holds run configurations and workspace layout, not only cache.', defaultEnabled: false },
      { id: 'history', label: '.history', match: '.history', kind: 'dir', hint: 'Snapshots written by the VS Code Local History extension.', caution: 'These snapshots are your only copy of edits made outside a commit. Nothing regenerates them.', defaultEnabled: false },
      { id: 'vscode-test', label: '.vscode-test', match: '.vscode-test', kind: 'dir', hint: 'VS Code builds downloaded by the extension test runner.' },
      { id: 'metals', label: '.metals', match: '.metals', kind: 'dir', hint: 'Scala Metals server state and indexes.' },
      { id: 'bloop', label: '.bloop', match: '.bloop', kind: 'dir', hint: 'Bloop build server configuration and compilation cache.' },
      { id: 'bsp', label: '.bsp', match: '.bsp', kind: 'dir', hint: 'Build Server Protocol connection files. Regenerated by the build tool.' },
      { id: 'ccls-cache', label: '.ccls-cache', match: '.ccls-cache', kind: 'dir', hint: 'ccls C and C++ index cache.' },
      { id: 'qtc-clangd', label: '.qtc_clangd', match: '.qtc_clangd', kind: 'dir', hint: 'Qt Creator clangd index.' },
      { id: 'sonarlint', label: '.sonarlint', match: '.sonarlint', kind: 'dir', hint: 'SonarLint analysis working directory.' },
      { id: 'ionide', label: '.ionide', match: '.ionide', kind: 'dir', hint: 'Ionide F# tooling cache.' }
    ]
  },
  {
    id: 'os-junk',
    label: 'OS Junk',
    indicators: [],
    global: true,
    accent: '#94a3b8',
    targets: [
      { id: 'ds-store', label: '.DS_Store', match: '.DS_Store', kind: 'file', hint: 'macOS Finder metadata.' },
      { id: 'thumbs-db', label: 'Thumbs.db', match: 'Thumbs.db', kind: 'file', hint: 'Windows thumbnail cache.' },
      { id: 'ehthumbs', label: 'ehthumbs.db', match: 'ehthumbs.db', kind: 'file', hint: 'Windows video thumbnail cache.' },
      { id: 'macosx', label: '__MACOSX', match: '__MACOSX', kind: 'dir', hint: 'Resource forks left behind by macOS archives.' }
    ]
  }
]

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getTarget(categoryId: string, targetId: string): TargetRule | undefined {
  return CATEGORY_BY_ID.get(categoryId)?.targets.find((t) => t.id === targetId)
}

export const NEVER_TRAVERSE = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '$RECYCLE.BIN',
  'System Volume Information'
])
