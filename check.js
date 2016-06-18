'use strict'

const got = require('got')
const ndjson = require('ndjson')
const sink = require('stream-sink')
const groupBy = require('lodash.groupBy')
const distance = require('gps-distance')

const _ = require('./helpers')
const cfg = require('./package.json').config
const planned = require('./planned.json')



got.stream(cfg.wolke)
.pipe(ndjson.parse())
.pipe(_.splitIntoTrips())
.pipe(_.sort())
.pipe(_.relative())
.pipe(_.timeslice())
.pipe(sink({objectMode: true}))
.on('data', (trips) => {
	const tripsByLine = groupBy(trips, (trip) => trip[0].line)
	// const normalized = {}
	for (let line in tripsByLine) {
		const trips = tripsByLine[line]

		for (let trip of trips) {
			for (let relative in trip) {
				const d1 = trip[relative]
				const d2 = planned[line][relative]
				const km = distance(d1.latitude, d1.longitude, d2.latitude, d2.longitude)
				if (km > .2) console.info(`${relative} weicht um ${km}km ab`)
			}
		}
	}

})
