ExhibitConf = {settings: {}};

ExhibitConf.settings.views = {
    "TileView": {label: "List", superclassName: "OrderedViewFrame"},
    "ThumbnailView": {superclassName: "OrderedViewFrame"},
    "TimelineView": {}
};

ExhibitConf.settings.facets = {
    "ListFacet": {label: "List",
                  specs: {"expression": {type: "text", defaultValue: ""}}},
    "CloudFacet": {label: "Tag Cloud",
		   specs: {"expression": {type: "text", defaultValue: ""}}},
    "NumericRangeFacet": {label: "Numeric Range",
			  specs: {"expression": {type: "text", 
						 defaultValue: ""}}},
    "HierarchicalFacet": {label: "Hierarchical List",
			  specs: {"expression": {type: "text", 
						 defaultValue: ""}}},
    "TextSearchFacet": {label: "Text Search", 
			specs: {"expressions": {type: "text", 
					       defaultValue: ""}}},
    "AlphaRangeFacet": {label: "Alphabetical Range",
			  specs: {"expression": {type: "text", 
						 defaultValue: ""}}}

};

ExhibitConf.settings.viewPanel = {
    "viewPanel": {label: "View Panel",
                  specs: {initialView: {type: "int",
                                        defaultValue: 0}}
                 }
};

ExhibitConf.nameAttribute = function(elmt, name) {
    elmt = $(elmt);

    if (elmt.attr(name) !== undefined) {
        return name;
    } else if (elmt.attr("data-ex-" + name)) {
        return "data-ex-" + name;
    } else {
        return "ex:" + name;
    } 
};


Exhibit.includeScript(function() {
    var i, 
    $=$,
    EC = ExhibitConf;

    EC.configureSettingSpecs = function() {

        var className,

        configureOne = function(comp, className, classFinder) {
            var humanize = function(str) {
                return  str.split(/\?=[A-Z]/g).join(' ');
            };

            comp.className = className;
            if (!comp.label) {
                comp.label = humanize(className);
            }
            if (classFinder(className)) {
                $.extend(comp.specs, classFinder(className)._settingSpecs);
            }
            if (comp.superclassName === "OrderedViewFrame") {
                //hack for subclassed views!
                jQuery.extend(true, comp.specs, 
                              Exhibit.OrderedViewFrame._settingSpecs);
            }
        };

        for (className in EC.settings.views) {
            if (EC.settings.views.hasOwnProperty(className)) {
                configureOne(EC.settings.views[className],
                             className,
                             Exhibit.UI.viewClassNameToViewClass);
            }
        }              

        for (className in EC.settings.facets) {
            if (EC.settings.facets.hasOwnProperty(className)) {
                configureOne(EC.settings.facets[className],
                             className,
                             Exhibit.UI.facetClassNameToFacetClass);
            }
        }
    };

    EC.makeSettingsTable = function(specs, settings) {

        var field,
        table = $('<table></table>'),

        inputBuilder = function(field) {
            var row = $('<tr></tr>'),
            inputHolder = $('<td></td>'),
            value = specs[field].defaultValue,
            updater = function() {
                settings[field] = $(this).val();
            },

	    boolUpdater = function() {
		settings[field] = $(this).is(':checked');
	    },
            boolInput = function(state) {
                if (state) {
                    return $('<input type=checkbox checked></input>');
                } else {
                    return $('<input type=checkbox></input>');
                }
            },
            textInput = function(state) {
                var inp =$('<input type="textfield"></input>');
                if ((state !== undefined) && (state !== null)) {
                    inp.val(state);
                }
                return inp;
            },
            intInput = function(state) {
                var inp =$('<input type="textfield" size=5></input>');
                if ((state !== undefined) && (state !== null)) {
                    inp.val(state);
                }
                return inp;
            },
            enumInput = function(values, state) {
                var i, choices = $('<select></select>'),
                optionElt = function(val, text) {
                    text = text || val;
                    return $('<option></option>').val(val).text(text);
                };

                for (i = 0; i < values.length; i++) {
                    optionElt(values[i]).appendTo(choices);
                }
                if (state) {choices.val(state);}
                return choices;
            };

            if (settings.hasOwnProperty(field)) {
                value = settings[field];
            }
            switch (specs[field].type) {
            case 'text':
                inputHolder.append(textInput(value).change(updater));
                break;
            case 'int':
                inputHolder.append(intInput(value).change(updater));
                break;
            case 'boolean':
                inputHolder.append(boolInput(value).change(boolUpdater));
                break;
            case 'enum':
                inputHolder.append(enumInput(specs[field].choices,
                                             value)
                                   .change(updater));
                break;
            }

            $('<td></td>').text(field).appendTo(row);
            inputHolder.appendTo(row);
            row.data('field',field);
            return row;
        }; //inputBuilder

        for (field in specs) {
            if (specs.hasOwnProperty(field)) {
                table.append(inputBuilder(field, settings[field]));
            }
        }

        return table;
    };

    //creates a dialog that destructively modifies settings
    EC.settingsDialog = function(comp, title, settings) {
        var className,
        deferred = $.Deferred(),
        //dummy tab is a hack due to tabs oddness: select event is not called
        //on initial (selected) tab, which prevents it initializing properly
        parts = $('<div><ul><li><a href="#dummy">dummy</a></li></ul><div id="dummy"></div></div>'),
        dialog = $('<div></div>').append(parts);

        parts.tabs({
            'add': function(event, ui) {
                $(ui.tab).data("class-name",className);
                return true;
            }});

        for (className in EC.settings[comp]) {
            if (EC.settings[comp].hasOwnProperty(className)) {
                parts.tabs("add", '#' + comp + '-' + className,
                           EC.settings[comp][className].label);
            }
        }

        parts.tabs({'select': function(event, ui) {
            settings.className = $(ui.tab).data("class-name");
            $(ui.panel).empty()
                .append(
                    EC.makeSettingsTable(EC.settings[comp][settings.className].specs,
                                     settings));
            return true;
        }});
                  
        parts.tabs('select','#' + comp + '-' + settings.className);
        parts.tabs('remove',0); //remove dummy tab once all else initialized
        dialog.dialog({"buttons": {
                              "Update": function() {
                                  dialog.dialog('close');
                                  deferred.resolve(settings);
                              },
                              "Cancel": function () {
                                  dialog.dialog('close');
                                  deferred.reject();
                              }
                          },
		        "modal": true, 
			"title": title,
                        "width": "500"

                      });
        return deferred.promise();
    };

    var configureElement = function(elt) {
        var specs, comp, className, title, field, eField, promise,
        settings = {},
        role = Exhibit.getRoleAttribute(elt);

        switch(role) {
        case "view": 
            comp = "views";
            title = "Configure View";
            className = Exhibit.getAttribute(elt,"viewClass") || "TileView";
            break;
        case "facet":
            comp = "facets";
            title = "Configure Facet";
            className = Exhibit.getAttribute(elt,"facetClass") || "ListFacet";
            break;
        case "viewPanel":
            comp = "viewPanel";
            title = "Configure View Panel";
            className = "viewPanel";
            break;
        }
        
        specs = EC.settings[comp][className].specs;
        Exhibit.SettingsUtilities.collectSettingsFromDOM(elt, specs, settings);

	settings.className = className;
        promise = EC.settingsDialog(comp, title, settings);

	promise.done(function () {
            //settings have been updated; push to element.  preserves 
            //non-conflicting settings; useful if switch back to
            //previous facet/view class.
            var field, eField;
            if (comp === 'facets') {
                elt.attr('ex:facetClass',settings.className);
            } else if (comp === 'views') {
                elt.attr('ex:viewClass',settings.className);
            }
	    delete settings.className; //so won't make an attribute
            for (field in specs) {
                if (specs.hasOwnProperty(field)) {
                    eField = EC.nameAttribute(comp,field);
                    if (settings[field] === specs[field].defaultValue) {
                        elt.removeAttr(eField);
                    } else {
                        elt.attr(eField, settings[field]);
                    }
                }
            }
        });
	return promise;
    };

    EC.unrender = function(dom) {
        dom = $(dom || document);
        dom.find('.exhibit-controlPanel').remove();
        dom.find('[ex\\:role="facet"]').empty().removeClass('exhibit-facet');
        dom.find('[ex\\:role="view"]')
            .removeClass('exhibit-view')
            .children()
            .not('[ex\\:role]')
            .remove();
        dom.find('[ex\\:role="viewPanel"]')
            .children()
            .not('[ex\\:role]')
            .remove();
    };
    
    EC.markExhibit = function() {
        $('[ex\\:role]').addClass('exhibit-editable');
    };

    EC.handleEditClick = function(event) {
        var button = $(event.target),
        elt = button.parent();

        button.detach();
        configureElement(elt).done(function() {
		EC.unrender(document);
		window.exhibit.configureFromDOM();
	    });
    };


    (function () {

        var editButton = $('<button class="exhibit-edit-tab">Edit</button>'),

        showEditButton = function () {
	    //quick hack: set parent css so edit button absolute positioning
	    //is relative to parent
	    editButton.detach();
            $(this).css('position','relative').prepend(editButton);
            return false; //stop propagation
        };


        EC.startEdit = function() {
	    EC.markExhibit();
	    editButton.click(EC.handleEditClick); //shouldn't have to
						  //re-add this every
						  //time but handler is
						  //somehow getting
						  //dropped when I
						  //detach the button
            $('body').on('mouseover','.exhibit-editable',showEditButton);
        };

        EC.stopEdit = function () {
            $('body').off('mouseover','.exhibit-editable',showEditButton);
	    editButton.off('click',EC.handleEditClick); //remove since re-add
            EC.unrender(document);
            window.exhibit.configureFromDOM();
        };
    })();

//    $(document).one("onBeforeLoadingItems.exhibit",function () {
//        EC.markExhibit();
//        EC.configureSettingSpecs();
//    });
});