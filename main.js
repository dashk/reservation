var incoming = require('./data/incoming');
var tables = require('./data/tables');

function getTimeSlotByHeadCount(headcount) {
	if (headcount === 1) {
		return 3;
	} else if (headcount >= 2 && headcount <= 3) {
		return 6;
	} else if (headcount >= 4 && headcount <= 6) {
		return 8;
	} else if (headcount >= 7 && headcount <= 10) {
		return 9;
	}
}

function compareScore(a, b) {
                if (a.score > b.score) {
                        return -1;
                } else if (a.score < b.score) {
                        return 1;
                } else if (a.headcount > b.headcount) {
                        return -1;
		} else if (a.headcount < b.headcount) {
			return 1;
		} else {
			return 0;
		}
}

function getStartIndex(startTime) {
	var adjustedStartTime = startTime - 1700;
	var minute = adjustedStartTime % 100;
	return Math.floor(adjustedStartTime / 100) * 4 +
		((minute === 15) ? 1 : 0) +
		((minute === 30) ? 2 : 0) +
		((minute === 45) ? 3 : 0);
}

function isReservationTimeLimitExceeded(reservation) {
	var startTime = getStartIndex(reservation.time);
	var duration = getTimeSlotByHeadCount(reservation.headcount);

	return (startTime + duration) > 20;
}

// Append ending time to incoming
var totalPeople = 0;
var reservationIndex = 0;

var reservations = incoming.map(function (input) {
	var startTimeSlot = getStartIndex(input.time);
	var endTimeSlot = getTimeSlotByHeadCount(input.headcount) + startTimeSlot - 1;
        totalPeople += input.headcount;
	reservationIndex ++;

	console.log("Reservation " + reservationIndex + ", Party: " + input.headcount + ", Start: " + startTimeSlot + ", End: " + endTimeSlot);
	return {
		'name': reservationIndex < 10 ? '0' + reservationIndex : reservationIndex,
		'startTime': input.time,
		'duration': getTimeSlotByHeadCount(input.headcount),
		'start': startTimeSlot,
		'end': endTimeSlot,
		'headcount': input.headcount,
		'score': Math.round((input.headcount / getTimeSlotByHeadCount(input.headcount)) * 100) / 100,
		'assignedTo': (isReservationTimeLimitExceeded(input) ? 'Unassigned (Time Limit)' : null)
	};
});
console.log("Total # of People: " + totalPeople);

function markSchedule(table, reservation) {
	for (var i = reservation.start; i <= reservation.end; ++i) {
		if (table.schedule[i]) {
			throw new Error('Timeslot with index ' + i + ' is already occupied in Table ' + table.name);
		}
		table.schedule[i] = reservation.name;
	}
}

var totalServed = 0;
function compareCapacity(a, b) {
        if (a.max > b.max) {
                return -1;
        } else if (a.max < b.max) {
                return 1;
        } else if (a.min > b.min) {
                return -1;
        } else if (a.min < b.min) {
                return 1;
        } else {
                return 0;
        }
}

tables.sort(compareCapacity).forEach(function (table) {
	table.schedule = new Array(20).fill(false);
	var peopleServed = 0;

	var suitable = findSuitableReservation(table, reservations);

	while (suitable.length > 0) {
		var reservation = suitable[0];
		reservation.assignedTo = table.name;
		peopleServed += reservation.headcount;
		markSchedule(table, reservation);

		suitable = findSuitableReservation(table, reservations);
	}

	table.served = peopleServed;
	//console.log("Schedule completed. Table " + table.name + " served " + table.served);
	
	totalServed += table.served;
});

console.log("Total # of people served: " + totalServed);
printTables(tables);
printReservations(reservations.sort(compareScore));

function isTableAvailableForReservation(table, reservation) {
	// Make sure capacity fits
        if (reservation.headcount < table.min ||
                reservation.headcount > table.max) {
                return false;
        }

        // Make sure schedule fits
	for (var i = reservation.start; i <= reservation.end; ++i) {
		if (table.schedule[i]) {
			return false;
		}
	}

	return true;
}

function printTables(allTables) {
	var timeline = [];
	for (var i = 0; i < 20; ++i) {
		if (i % 4 === 0) {
			timeline.push(17 + (i % 4));
		} else {
			timeline.push('  ');
		}
	}
	console.log('\t|' + timeline.join('|'));
	allTables.forEach(function(table) {
		console.log(table.name + '/' + table.min + '-' + table.max + '\t|' + table.schedule.map(function(timeslot) { return timeslot ? '' + timeslot + '|' : '  |'; }).join(''));
	});
}

function printReservations(allReservations) {
	allReservations.forEach(function (reservation) {
		console.log(reservation.name + ", Party: " + reservation.headcount + ", Assigned To: " + reservation.assignedTo);
	});
}

function findSuitableReservation(table, requests) {
	var filtered = requests.filter(function (request) {
		// Make sure it's not already assigned
		if (!!request.assignedTo) {
			return false;	
		}
		return isTableAvailableForReservation(table, request);
	}).sort(compareScore);
	return filtered;
}
