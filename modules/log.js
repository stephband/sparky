export function log(text) {
    window.console.log('%cSparky%c ' + text,
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
    );
}

export function logNode(target, attrIs, attrFn, attrInclude) {
    window.console.log('%cSparky%c'
        + ' ' + (window.performance.now() / 1000).toFixed(3)
        + ' <'
        + (target.tagName.toLowerCase())
        + (attrIs ? ' is="' + attrIs + '"' : '')
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' include="' + attrInclude + '"' : '')
        + '>',
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
    );
}