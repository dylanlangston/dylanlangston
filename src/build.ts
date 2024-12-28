import { build, get_default_templates } from './library/Builder';
import packageJson from './package.json';

console.log(`Starting build 🏇`);
build(get_default_templates(), packageJson.version, new Date(process.env.BUILD_TIME ?? new Date())).then(() => {
    console.log(`Build Successful ✨`);
}, error => {
    console.error(`Build Failed ⚠️\n`)
    throw error;
});

