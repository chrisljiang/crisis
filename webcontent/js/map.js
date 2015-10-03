/** @enum {string} */
crisis.MapState = {
    NORMAL: 'NORMAL',
    GETTING_CLICK: 'GETTING_CLICK'
};

/**
 * @export
 */
crisis.map = {
    /** @type {Array<crisis.Division>} */
    divisions: [],
    /** @type {?crisis.Bounds} */
    absBounds: null,
    /** @type {crisis.Bounds} */
    relBounds: new crisis.Bounds(100, 100),
    /** @type {crisis.Bounds} */
    minRelBounds: new crisis.Bounds(100, 100),
    /** @type {crisis.MapState} */
    state: crisis.MapState.NORMAL,
    /** @type {jQuery} */
    $holder: null,
    /** @type {jQuery} */
    $mapBounds: null,
    /** @type {jQuery} */
    $outerMapDiv: null,
    /** @type {jQuery} */
    $addDivisionButton: null
};

/** @export */
crisis.map.init = function() {
    crisis.map.$holder = $('#mapHolder');
    crisis.map.$mapBounds = $('#mapBounds');
    crisis.map.$outerMapDiv = $('#mapOuterDiv');
    crisis.map.$newDivisionButton = $('#newDivisionButton');
    crisis.map.$zoomInButton = $('#zoomInButton');
    crisis.map.$zoomOutButton = $('#zoomOutButton');

    crisis.map.$holder.draggable({containment: crisis.map.$mapBounds});

    crisis.map.$newDivisionButton.on('click' + crisis.event.baseNameSpace,
        function() {
            crisis.map.getClick(function(absCoords) {
                var tmpDiv = new crisis.Division({
                    Id: -1,
                    Coords: absCoords.toJson(),
                    Units: [],
                    Name: '',
                    FactionId: -1
                });
                tmpDiv.details.open();
                tmpDiv.$marker.hide();
                tmpDiv.details.enableCreate();
            });
        });

    crisis.map.$zoomInButton.on('click' + crisis.event.baseNameSpace,
        function() {
            crisis.map.zoom(2, crisis.map.centerClick());
        });

    crisis.map.$zoomOutButton.on('click' + crisis.event.baseNameSpace,
        function() {
            crisis.map.zoom(0.5, crisis.map.centerClick());
        });

    crisis.ajax.pollNow(crisis.ajax.mapPath, {
        success: function(data) {
            crisis.map.updateData(data);
        }
    });
};

/** @param {crisisJson.Crisis} crisisData */
crisis.map.updateData = function(crisisData) {
    crisis.map.absBounds = crisis.Bounds.fromJson(crisisData.MapBounds);

    crisis.updateElements(crisis.map.divisions, crisisData.Divisions,
        function(divJson) { return new crisis.Division(divJson); });

    // /** @type {Array<crisis.Division>} */
    // var removedDivisions = [];
    // _.each(crisis.map.divisions, function(div) {
    //     var updated = _.findWhere(crisisData.Divisions, {Id: div.id});
    //     if (updated === undefined) {
    //         div.destroy();
    //         removedDivisions.push(div);
    //     } else {
    //         div.updateData(updated);
    //     }
    //     crisisData.Divisions = /** @type {Array<crisisJson.Division>} */
    //         (_.without(crisisData.Divisions, updated));
    // });

    // _.each(removedDivisions, function(removedDivision) {
    //     crisis.map.divisions = /** @type {Array<crisis.Division>} */
    //         (_.without(crisis.map.divisions, removedDivision));
    // });

    // _.each(crisisData.Divisions, function(divJson) {
    //     crisis.map.divisions.push(new crisis.Division(divJson));
    // });
};

/** @param {crisisJson.Division} divJson */
crisis.map.addDivision = function(divJson) {
    crisis.map.divisions.push(new crisis.Division(divJson));
};

/**
 * @param {jQuery} $dropdown
 * @param {jQuery} $source
 * @param {jQuery} $container
 */
crisis.map.positionDropdown = function($dropdown, $source, $container) {
    var containerTop = $container.position().top;
    var containerLeft = $container.position().left;
    var containerBottom = containerTop + $container.height();
    var containerRight = containerLeft + $container.width();
    var idealY = $source.position().top + $source.height();
    if (idealY + $dropdown.length > containerBottom) {
        idealY += containerBottom - (idealY + $dropdown.length);
    }

    if (idealY < containerTop) {
        idealY += containerTop - idealY;
    }

    var idealX = $source.position().left + $source.width();
    if (idealX + $dropdown.width() > containerRight) {
        idealX += containerRight - (idealX + $dropdown.width());
    }

    if (idealX < containerLeft) {
        idealX += containerLeft - idealX;
    }

    $dropdown.css({
        'left': (idealX * 100 / $container.width()) + '%',
        'top': (idealY * 100 / $container.height()) + '%'
    });
};

/**
 * @param {jQuery.Event} clickEvent
 * @return {crisis.Coords}
 */
crisis.map.absCoordsOfClick = function(clickEvent) {
    return new crisis.Coords(0, 0);
};

/**
 * @param {crisis.Coords} absCoords
 * @return {crisis.Coords}
 */
crisis.map.relativeCoordsOfAbs = function(absCoords) {
    return new crisis.Coords(absCoords.x * 100 / crisis.map.absBounds.width,
                             absCoords.y * 100 / crisis.map.absBounds.height);
};

/**
 * @param {crisis.Coords} relCoords
 * @return {crisis.Coords}
 */
crisis.map.absCoordsOfRelative = function(relCoords) {
    return new crisis.Coords(
        Math.round(crisis.map.absBounds.width * relCoords.x / 100),
        Math.round(crisis.map.absBounds.height * relCoords.y / 100)
    );
};

/**
 * @param {number} factor
 * @param {crisis.Coords} fixPoint
 */
crisis.map.zoom = function(factor, fixPoint) {
    var newBounds = new crisis.Bounds(
        Math.max(crisis.map.minRelBounds.width,
                 crisis.map.relBounds.width * factor),
        Math.max(crisis.map.minRelBounds.height,
                 crisis.map.relBounds.height * factor)
    );

    var newFactor = newBounds.width / crisis.map.relBounds.width;

    var holderLeft = crisis.getCssPx(crisis.map.$holder, 'left');
    var holderWidth = crisis.getCssPx(crisis.map.$holder, 'width');
    var holderTop = crisis.getCssPx(crisis.map.$holder, 'top');
    var holderHeight = crisis.getCssPx(crisis.map.$holder, 'height');
    var outerWidth = crisis.getCssPx(crisis.map.$outerMapDiv, 'width');
    var outerHeight = crisis.getCssPx(crisis.map.$outerMapDiv, 'height');

    var absOuterFixPoint = new crisis.Coords(
        fixPoint.x + holderLeft,
        fixPoint.y + holderTop
    );

    var absMapFixOrigPoint = new crisis.Coords(
        fixPoint.x * newFactor + holderLeft,
        fixPoint.y * newFactor + holderTop
    );

    var absMapFixDelta = new crisis.Coords(
        absOuterFixPoint.x - absMapFixOrigPoint.x,
        absOuterFixPoint.y - absMapFixOrigPoint.y
    );

    if (holderLeft + holderWidth * newFactor + absMapFixDelta.x < outerWidth) {
        absMapFixDelta.x +=
            outerWidth - (holderLeft + holderWidth + absMapFixDelta.x);
    }
    if (holderLeft + absMapFixDelta.x > 0) {
        absMapFixDelta.x -= (holderLeft + absMapFixDelta.x);
    }
    if (holderTop + holderHeight * newFactor + absMapFixDelta.y < outerHeight) {
        absMapFixDelta.y +=
            outerHeight - (holderTop + holderHeight + absMapFixDelta.y);
    }
    if (holderTop + absMapFixDelta.y > 0) {
        absMapFixDelta.y -= (holderTop + absMapFixDelta.y);
    }

    console.log(absMapFixDelta);

    crisis.map.relBounds = newBounds;

    crisis.map.$mapBounds.css({
        'height': (2 * crisis.map.relBounds.height - 100) + '%',
        'width': (2 * crisis.map.relBounds.width - 100) + '%',
        'top': '-' + (crisis.map.relBounds.height - 100) + '%',
        'left': '-' + (crisis.map.relBounds.width - 100) + '%'
    });
    crisis.map.$holder.animate({
        'height': crisis.map.relBounds.height + '%',
        'width': crisis.map.relBounds.width + '%',
        'top': (holderTop + absMapFixDelta.y) + 'px',
        'left': (holderLeft + absMapFixDelta.x) + 'px'
    });
};

/**
 * @param {Array<number>} notInclude
 * @param {jQuery} $positionIn
 * @param {function(?number)} callback
 * @return {function()} a function which cancels this process
 */
crisis.map.showUnitTypeFinder = function(notInclude, $positionIn, callback) {
    var $thisFinder = crisis.cloneProto(crisis.$protoUnitTypeFinder);

    _.each(notInclude, function(num) {
        $thisFinder.children(crisis.unitTypeSelector(num)).remove();
    });

    /** @type {function()} */
    var cancel;

    $thisFinder.children().on('click' + crisis.event.baseNameSpace, function() {
        callback(crisis.getNumericData($(this), 'type'));
        cancel();
    });

    var $children = $positionIn.children();

    cancel = function() {
        $thisFinder.remove();
        $positionIn.append($children);
    };

    $children.detach();
    $positionIn.append($thisFinder);

    return cancel;
};

/** @param {function(crisis.Coords)} callback */
crisis.map.getClick = function(callback) {
    crisis.map.state = crisis.MapState.GETTING_CLICK;

    crisis.map.$holder.on('click' + crisis.event.getClickNameSpace,
        function(clickEvent) {
            var absCoordsOfClick = crisis.map.absCoordsOfRelative(
                new crisis.Coords(clickEvent.offsetX * 100 / crisis.map.$holder.width(),
                                  clickEvent.offsetY * 100 / crisis.map.$holder.height())
            );

            crisis.map.stopGettingClick();
            callback(absCoordsOfClick);
        });
};

/** @return {crisis.Coords} */
crisis.map.centerClick = function() {
    return new crisis.Coords(
        crisis.map.$outerMapDiv.width() / 2 -
            crisis.getCssPx(crisis.map.$holder, 'left'),
        crisis.map.$outerMapDiv.height() / 2 -
            crisis.getCssPx(crisis.map.$holder, 'top')
    );
};

crisis.map.stopGettingClick = function() {
    if (crisis.map.state !== crisis.MapState.GETTING_CLICK) return;
    crisis.map.$holder.off('click' + crisis.event.getClickNameSpace);
    crisis.map.state = crisis.MapState.NORMAL;
};
