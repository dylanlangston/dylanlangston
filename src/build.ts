import { build, get_default_templates } from './library/Builder';

build(get_default_templates()).then(() => {
    console.log(`Build Successful ✨`);
}, error => {
    console.error(`Build Failed ⚠️\n`, error)
});

