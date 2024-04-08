import { build, default_templates } from './library/Builder';

build(default_templates).then((result) => {
    if (result) {
        console.log(`Build Successful ✨`);
    }
    else {
        console.log(`Build Failed ⚠️`);
        process.exit(1);
    }
}, error => {
    console.error('Unknown Error:', error);
});

