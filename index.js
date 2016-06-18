'use strict'

const through = require('through2')
const map = require('through2-map')
const got = require('got')
const ndjson = require('ndjson')
const filter = require('stream-filter')
const cfg = require('./package.json').config



const group = () => {
	let trip = []
	let last = 0
	return through.obj(function (data, _, cb) {
		if ((data.when - last) > 60 * 60 && trip.length > 0) { // gap of >= 1 hour
			this.push(trip)
			trip = []
		} else trip.push(data)
		last = data.when
		cb()
	}, function (cb) {
		this.push(trip)
		cb()
	})
}

const sort = () => map.obj((trip) => trip.sort((a, b) => a.when - b.when))

got.stream(cfg.wolke)
.on('error', console.error)
.pipe(ndjson.parse())
.on('error', console.error)
.pipe(filter((data) => data.line === 'ICE 123'))
.pipe(group())
.pipe(sort())
.on('error', console.error)
.on('data', (data) => {

	console.log(data)

})
