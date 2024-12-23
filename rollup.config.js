import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'

const { BUILD_ENV } = process.env

const config = {
  input: 'src/index.js',
  output: {
    name: 'withSideEffect',
    globals: {
      react: 'React',
    },
  },
  plugins: [
    babel({
      babelrc: false,
      presets: [
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-env', { loose: true, modules: false }],
      ],
      exclude: 'node_modules/**',
    }),
  ],
  external: ['react'],
}

if (BUILD_ENV === 'production') {
  config.plugins.push(uglify())
}

export default config
