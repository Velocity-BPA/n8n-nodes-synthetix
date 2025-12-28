/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

const { src, dest } = require('gulp');

function buildIcons() {
  return src('nodes/**/*.svg').pipe(dest('dist/nodes'));
}

function copyImages() {
  return src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;
