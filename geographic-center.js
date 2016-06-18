'use strict'

const mean = require('lodash.mean')

// SHAME! Needs a rework.
const center = (points) => {
	const result = {lats: [], lons: []}
	points.forEach(function(point){
		result.lats.push(point.latitude)
		result.lons.push(point.longitude)
	})
	for (let axis of ['lats', 'lons']) {
		let a = result[axis]
		a.sort()
		a = a.slice(0, Math.round(a.length * .9))
		a.reverse()
		a = a.slice(0, Math.round(a.length * (8/9)))
		a.reverse()
		result[axis] = mean(a)
	}
	return {latitude: result.lats, longitude: result.lons}
}

module.exports = center
