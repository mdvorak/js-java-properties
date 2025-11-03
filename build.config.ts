import {defineBuildConfig} from 'unbuild'

export default defineBuildConfig({
    entries: ['src/index'],
    declaration: true,
    clean: true,
    outDir: 'lib',
    rollup: {
        emitCJS: true
    }
})
