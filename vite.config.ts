import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'tstorex',
			formats: ["cjs", "es", "umd"]
		},
		sourcemap: true,
	},
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