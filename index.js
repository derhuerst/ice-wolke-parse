'use strict'

const through = require('through2')
const map = require('through2-map')
const got = require('got')
const ndjson = require('ndjson')
const filter = require('stream-filter')
const sink = require('stream-sink')
const maxBy = require('lodash.maxBy')
const groupBy = require('lodash.groupBy')

const cfg = require('./package.json').config
const center = require('./geographic-center')



const splitIntoTrips = () => {
	let trip = []
	let last = 0
	let line = NaN
	return through.obj(function (d, _, cb) {
		if (trip.length > 0 &&
			((d.when - last) > 60 * 60 || d.line !== line)) {
			this.push(trip)
			trip = []
		} else trip.push(d)
		last = d.when
		line = d.line
		cb()
	}, function (cb) {
		this.push(trip)
		cb()
	})
}

const sort = () => map.obj((trip) => trip.sort((a, b) => a.when - b.when))

const relative = () => map.obj((trip) => {
	if (trip.length === 0) return trip
	const start = trip[0].when
	return trip.map((data) => Object.assign({}, data, {relative: data.when - start}))
})

const timeslice = () => map.obj((trip) => {
	const chunked = {}
	for (let data of trip) {
		chunked[Math.floor((data.relative + cfg.interval / 2) / cfg.interval)] = data
	}
	return chunked
})



got.stream(cfg.wolke)
.pipe(ndjson.parse())
.pipe(splitIntoTrips())
.pipe(sort())
.pipe(relative())
.pipe(timeslice())
.pipe(sink({objectMode: true}))
.on('data', (trips) => {
	const tripsByLine = groupBy(trips, (trip) => trip[0].line)
	const normalized = {}
	for (let line in tripsByLine) {
		const trips = tripsByLine[line]

		// Because we want to get proper average positions by time, we have to right-pad faster (shorter) trips.
		const longest = maxBy(trips, (trip) => Object.keys(trip).length)
		const maxLength = Object.keys(longest).length

		for (let trip of trips) {
			const length = Object.keys(trip).length
			const last = trip[length - 1]
			for (let i = length; i < maxLength; i++) trip[i] = last
		}

		// Compute average positions by time
		const centers = normalized[line] = []
		for (let i = 0; i < maxLength; i++) {
			const position = center(trips.map((trip) => trip[i]))
			centers.push(Object.assign(position, {relative: i * cfg.interval}))
		}

	}
	process.stdout.write(JSON.stringify(normalized))

})
