'use strict'

const got = require('got')
const ndjson = require('ndjson')
const sink = require('stream-sink')
const groupBy = require('lodash.groupBy')
const fs = require('fs')

const cfg = require('./package.json').config
const _ = require('./helpers')
const center = require('geographic-center')



got.stream(cfg.wolke)
.pipe(ndjson.parse())
.pipe(_.splitIntoTrips())
.pipe(_.sort())
.pipe(_.relative())
.pipe(_.timeslice())
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

			const position = center(trips.map((trip) => ({lat: trip[i].latitude, lon: trip[i].longitude}))
			centers.push({latitude: position.lat, longitude: position.lon, relative: i * cfg.interval}))
		}

	}
	fs.writeFile('planned.json', JSON.stringify(normalized), (err) => {
		if (err) console.error(err)
	})

})
