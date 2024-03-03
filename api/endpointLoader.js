const path = require('path');
const fs = require('fs');

function readFiles(path) {
    let flat = [];
    let all = fs.readdirSync(path, {withFileTypes: true})
    .map(item => item.name)
    .filter(item => 
        item[0] !== "_" &&
        (item.endsWith(".js") ||
         fs.lstatSync(`${path}/${item}`).isDirectory()
        )
    );

    all.forEach(item => {
        if (fs.lstatSync(`${path}/${item}`).isDirectory()) {
            // recurse
            let sub = readFiles(`${path}/${item}`);
            sub.forEach(subItem => {
                flat.push(`${item}/${subItem}`);
            })
            
        } else {
            flat.push(item);
        }
    })
    return flat;
}

function loadEndpoints(app, dir) {
    let endpointDir = path.join(__dirname, dir);
    
    readFiles(endpointDir).forEach(file => {
        const endpointPath = path.join(endpointDir, file);
        const endpoint = require(endpointPath);
        endpoint(app);
    });
}
module.exports = loadEndpoints;