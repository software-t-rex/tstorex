import { defineConfig as defineViteConfig } from 'vite'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

const viteConf = defineViteConfig({
	build: {
		lib: {
			entry: {
				index: 'src/index.ts',
				recipes: 'src/recipes/index.ts',
			},
			formats: ["cjs", "es"]
		},
		sourcemap: true,
	},
	plugins: [dts({ rollupTypes: true })],
})

const vitestConf = defineVitestConfig({
	test: {
		coverage:{
			enabled: true,
			include:["src/**/*"],
			exclude:["src/type.ts", "src/index.ts", "**/*.spec.ts"],
			reportsDirectory:'./coverage',
			reporter:["html-spa"],
		}
	}
})

export default mergeConfig(viteConf, vitestConf)