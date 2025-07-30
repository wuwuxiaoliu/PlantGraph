// utils.js
// 通用变量与初始化设置，供其他模块使用


import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export const svg = d3.select("svg"), g = svg.append("g");
export const tooltip = d3.select("#tooltip");

export const allNodes = new Map();
export const allLinks = new Set();
export const historyStack = [];

svg.call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => g.attr("transform", e.transform)));

