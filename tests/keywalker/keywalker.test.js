define([
	'keywalker/keywalker'
], function (keywalker) {
	"use strict";

	var registerSuite = intern.getInterface('object').registerSuite,
		assert = intern.getPlugin('chai').assert,
		testHolder,
		groupedElements,
		treeRoot;

	// do not reject any node.
	function simpleFilter() {
		return NodeFilter.FILTER_ACCEPT;
	}

	function enabledFilter (el) {
		if (el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled")) {
			return NodeFilter.FILTER_REJECT;
		}
		return NodeFilter.FILTER_ACCEPT;
	}

	function hiddenFilter(el) {
		if (el.hasAttribute("hidden")) {
			return NodeFilter.FILTER_REJECT;
		}
		return NodeFilter.FILTER_ACCEPT;
	}

	function treeFilter (el) {
		var result = enabledFilter(el), role;
		if (result === NodeFilter.FILTER_REJECT) {
			return result;
		}
		result = hiddenFilter(el);
		if (result === NodeFilter.FILTER_REJECT) {
			return result;
		}
		if ((role = el.getAttribute("role"))) {
			if (role === "group" || role === "treeitem") {
				return NodeFilter.FILTER_ACCEPT;
			}
			return NodeFilter.FILTER_REJECT;
		}
		return NodeFilter.FILTER_SKIP;
	}

	function makeGroupConfig(cycle, filter) {
		return {
			root: groupedElements,
			cycle: !!cycle,
			filter: (filter || simpleFilter)
		};
	}

	function makeTreeConfig(cycle, depthFirst, filter) {
		var _filter = typeof filter === "function" ? filter : treeFilter;
		return {
			root: treeRoot,
			cycle: !!cycle,
			depthFirst: !!depthFirst,
			filter: _filter
		};
	}

	function mockClosedBranchNodesFilter(el) {
		var result = treeFilter(el);
		if (result !== NodeFilter.FILTER_REJECT) {
			if (el.getAttribute("role") === "group") {
				return NodeFilter.FILTER_REJECT;
			}
		}
		return result;
	}

	registerSuite('Keywalker tests', {
		before() {
			var testContent = "\
<div id='domKeyWalkerGroup' role='radiogroup'>\
	<span id='domKeyWalkerGroupR1' role='radio' aria-selected='false'>Option 1</span>\
	<span id='beforeSelected' role='radio' aria-selected='false'>Option <strong>2</strong></span>\
	<span id='beforeDisabled' role='radio' aria-selected='true'>Option 3</span>\
	<span id='disabledRadio' role='radio' aria-selected='false' aria-disabled='true'>Option 4</span>\
	<span id='afterDisabled' role='radio' aria-selected='false' aria-hidden='true'>Option 5</span>\
</div>\
<div id='domKeyWalkerTree' role='tree'>\
	<span id='tree1' role='treeitem'>leaf 1</span>\
	<span id='tree2' role='treeitem'>leaf 2</span>\
	<div id='tree3' role='group' aria-labelledby='tree3label'>\
    <span id='tree3label'>branch 3</span>\
    <span id='tree31' role='treeitem'>leaf 31</span>\
		<span id='tree32' role='treeitem'>leaf 32</span>\
		<span id='tree33' role='treeitem'>leaf 33</span>\
	</div>\
	<span id='tree4' role='treeitem'>leaf 4</span>\
	<span id='tree5' role='treeitem'>leaf 5</span>\
	<span id='tree6' role='treeitem'>leaf 6</span>\
	<span id='tree7' role='treeitem'>leaf 7</span>\
</div>";
			testHolder = document.getElementById("testholder");
			if (!testHolder) {
				document.body.insertAdjacentHTML("beforeend", "<div id='testholder'></div>");
				testHolder = document.getElementById("testholder");
			}
			testHolder.innerHTML = testContent;
		},
		beforeEach: function() {
			if (!groupedElements) {
				var container = document.getElementById("domKeyWalkerGroup");
				if (container) {
					groupedElements = container.getElementsByTagName("span");
				} else {
					assert.fail(null, !null, "Could not get container of group to traverse");
				}
				if (!(groupedElements && groupedElements.length)) {
					assert.fail(null, !null, "Could not get group to traverse");
				}
			}
			if (!treeRoot) {
				treeRoot = document.getElementById("domKeyWalkerTree");
				if (!treeRoot) {
					assert.fail(null, !null, "Could not get root to traverse");
				}
			}
		},
		after: function() {
			testHolder.innerHTML = "";
		},
		tests: {
			'Test walking linear groups': {
				testGetTargetFirstFromOther: function() {
					var start = groupedElements[1],
						expected = groupedElements[0],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "getTarget should return the first member of the group");
				},
				testGetTargetFirstFromFirst: function() {
					var start = groupedElements[0],
						expected = groupedElements[0],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "getTarget should return the first member of the group");
				},
				testGetTargetLastFromOther: function() {
					var start = groupedElements[1],
						expected = groupedElements[groupedElements.length - 1],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "getTarget should return the last member of the group");
				},
				testGetTargetLastFromLast: function() {
					var start = groupedElements[groupedElements.length - 1],
						expected = groupedElements[groupedElements.length - 1],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "getTarget should return the last member of the group");
				},
				testGetNextFromNotLast: function() {
					var start = groupedElements[0],
						expected = groupedElements[1],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "getTarget should return the next member of the group");
				},
				testGetNextFromLastNoCycle: function() {
					var start = groupedElements[groupedElements.length - 1],
						expected = null,
						actual = keywalker.getTarget(makeGroupConfig(false), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "getTarget NEXT from last should return null");
				},
				testGetNextFromLastWithCycle: function() {
					var start = groupedElements[groupedElements.length - 1],
						expected = groupedElements[0],
						actual = keywalker.getTarget(makeGroupConfig(true), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "getTarget should return the first member of the group");
				},
				testGetPreviousFromNotFirst: function() {
					var start = groupedElements[1],
						expected = groupedElements[0],
						actual = keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "getTarget should return the previous member of the group");
				},
				testGetPreviousFromFirstNoCycle: function() {
					var start = groupedElements[0],
						expected = null,
						actual = keywalker.getTarget(makeGroupConfig(false), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "getTarget PREVIOUS from first should return null");
				},
				testGetPreviousFromFirstWithCycle: function() {
					var start = groupedElements[0],
						expected = groupedElements[groupedElements.length - 1],
						actual = keywalker.getTarget(makeGroupConfig(true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "getTarget should return the last member of the group");
				},
				testGetNextWithFilter: function() {
					var start = document.getElementById("beforeDisabled"),
						expected = document.getElementById("afterDisabled"),
						actual = keywalker.getTarget(makeGroupConfig(false, enabledFilter), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "getTarget NEXT with filter should skip the disabled item.");
				},
				testGetPreviousWithFilter: function() {
					var expected = document.getElementById("beforeDisabled"),
						start = document.getElementById("afterDisabled"),
						actual = keywalker.getTarget(makeGroupConfig(false, enabledFilter), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "getTarget PREVIOUS with filter should skip the disabled item.");
				},
				testGetLastWithFilter: function() {
					var start = groupedElements[0],
						expected = document.getElementById("beforeDisabled"),
						_filter = function(el) {
							if (el.getAttribute("aria-hidden") === "true" || el.getAttribute("aria-disabled") === "true") {
								return NodeFilter.FILTER_REJECT;
							}
							return NodeFilter.FILTER_ACCEPT;
						},
						actual = keywalker.getTarget(makeGroupConfig(false, _filter), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "getTarget LAST with filter should skip the filtered items.");
				},
				testGetFirstWithFilter: function() {
					var start = groupedElements[groupedElements.length - 1],
						expected = groupedElements[1],
						_filter = function(el) {
							if (el.id === "domKeyWalkerGroupR1") {
								return NodeFilter.FILTER_REJECT;
							}
							return NodeFilter.FILTER_ACCEPT;
						},
						actual = keywalker.getTarget(makeGroupConfig(false, _filter), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "getTarget LAST with filter should skip the filtered items.");
				},
				testGetTargetFallbackFilter: function() {
					var start = groupedElements[1],
						expected = groupedElements[0],
						config = makeGroupConfig(),
						actual;
					config.filter = null;
					actual = keywalker.getTarget(config, start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected);
				},
				testGetTargetNextFallbackFilter: function() {
					var start = groupedElements[1],
						expected =groupedElements[2],
						config = makeGroupConfig(),
						actual;
					config.filter = null;
					actual = keywalker.getTarget(config, start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected);
				},
				testGetTargetNextFallbackFilterDoesNotFindDisabledHidden: function() {
					var start = document.getElementById("beforeDisabled"),
						config = makeGroupConfig(),
						actual;
					config.filter = null;
					actual = keywalker.getTarget(config, start, keywalker.MOVE_TO.NEXT);
					assert.isNull(actual);
				},
				testGetTargetNextFallbackFilterWithCycle: function() {
					var start = document.getElementById("beforeDisabled"),
						expected = groupedElements[0],
						config = makeGroupConfig(true),
						actual;
					config.filter = null;
					actual = keywalker.getTarget(config, start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected);
				},
				testGetTargetGroupWithNoDirection: function () {
					assert.isNull(keywalker.getTarget(makeGroupConfig(), groupedElements[0], null));
				}
			},
			'Test walking trees':{
				testGetTargetTreeFirstNotFirst: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "FIRST FAILED with Tree");
				},
				testGetTargetTreeFirstFromFirst: function() {
					var start = document.getElementById("tree1"),
						expected = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "FIRST from FIRST FAILED with Tree");
				},
				testGetTargetTreeLastNotLast: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "LAST FAILED with Tree");
				},
				testGetTargetTreeLastFromLast: function() {
					var start = document.getElementById("tree7"),
						expected = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "LAST from LAST FAILED with Tree");
				},
				testGetTargetTreeFirstNotFirstSubBranch: function() {
					var start = document.getElementById("tree32"),
						expected = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "FIRST in sub branch FAILED with Tree");
				},
				testGetTargetTreeFirstFromFirstSubBranch: function() {
					var start = document.getElementById("tree31"),
						expected = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
					assert.strictEqual(actual, expected, "FIRST from FIRST in sub branch FAILED with Tree");
				},
				testGetTargetTreeLastNotLastSubBranch: function() {
					var start = document.getElementById("tree32"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "LAST in sub brnanch FAILED with Tree");
				},
				testGetTargetTreeLastFromLastSubBranch: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
					assert.strictEqual(actual, expected, "LAST from LAST in sub branch FAILED with Tree");
				},
				testPreviousInTreeSimple: function() {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree5"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "simple PREVIOUS FAILED with Tree");
				},
				testGetTargetPreviousTreeOverBranchNoDepthFirst: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree3"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "Branch PREVIOUS no depth first failed");
				},
				testGetTargetPreviousTreeOverBranchDepthFirst: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(false, true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "Branch PREVIOUS with depth first failed");
				},
				testNextInTreeSimple: function() {
					var start = document.getElementById("tree5"),
						expected = document.getElementById("tree6"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "simple NEXT FAILED with Tree");
				},
				testGetTargetNextTreeOverBranchNoDepthFirst: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree4"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "Branch next no depth first failed");
				},
				testGetTargetNextTreeOverBranchDepthFirst: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(false, true), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "Branch next with depth first failed");
				},
				testPreviousInTreeFirstNode: function() {
					var start = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
					assert.isNull(actual, "PREVIOUS from first in Tree should be null");
				},
				testNextInTreeLastNode: function() {
					var start = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
					assert.isNull(actual, "NEXT from last in Tree should be null");
				},
				testPreviousInTreeFirstNodeWithCycle: function() {
					var start = document.getElementById("tree1"),
						expected = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "PREVIOUS from first in Tree with cycle FAILED");
				},
				testNextInTreeLastNodeWithCycle: function() {
					var start = document.getElementById("tree7"),
						expected = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "NEXT from first in Tree with cycle FAILED");
				},
				testPreviousInTreeFirstNodeSubBranch: function() {
					var start = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
					assert.isNull(actual, "PREVIOUS from first in Tree sub branch should be null");
				},
				testNextInTreeLastNodeSubBranch: function() {
					var start = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
					assert.isNull(actual, "NEXT from last in Tree sub branch should be null");
				},
				testPreviousInTreeFirstNodeWithCycleSubBranch: function() {
					var start = document.getElementById("tree31"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "PREVIOUS from first in Tree sub branch with cycle FAILED");
				},
				testNextInTreeLastNodeWithCycleSubBranch: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "NEXT from first in Tree sub branch with cycle FAILED");
				},
				testPreviousInTreeFirstNodeSubBranchDepthFirst: function() {
					var start = document.getElementById("tree31"),
						expected = document.getElementById("tree3"),
						actual = keywalker.getTarget(makeTreeConfig(false, true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected, "NEXT from first in Tree sub branch with depth first FAILED");
				},
				testNextInTreeLastNodeSubBranchDepthFirst: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree4"),
						actual = keywalker.getTarget(makeTreeConfig(false, true), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected, "NEXT from first in Tree sub branch with depth first FAILED");
				},
				testGetTargetTreeParentSimple: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree3"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PARENT);
					assert.strictEqual(actual, expected, "Simple PARENT failed");
				},
				testGetTargetTreeChildSimple: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree31"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.CHILD);
					assert.strictEqual(actual, expected, "Simple CHILD failed");
				},
				testGetTargetTreeLastChildSimple: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST_CHILD);
					assert.strictEqual(actual, expected, "Simple LAST_CHILD failed");
				},
				testGetTargetTreeTop: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.TOP);
					assert.strictEqual(actual, expected, "Simple TOP failed");
				},
				testGetTargetTreeTopFromSubBranch: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.TOP);
					assert.strictEqual(actual, expected, "Simple TOP from sub branch failed");
				},
				testGetTargetTreeEnd: function() {
					var start = document.getElementById("tree3"),
						expected = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.END);
					assert.strictEqual(actual, expected, "Simple END failed");
				},
				testGetTargetTreeEndFromSubBranch: function() {
					var start = document.getElementById("tree33"),
						expected = document.getElementById("tree7"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.END);
					assert.strictEqual(actual, expected, "Simple END from sub branch failed");
				},
				testGetTargetTreePreviousIntoSubBranchDepthFirst: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree33"),
						actual = keywalker.getTarget(makeTreeConfig(false, true), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected);
				},
				testGetTargetTreeNextOverClosedBranch: function() {
					var start = document.getElementById("tree2"),
						expected = document.getElementById("tree4"),
						actual = keywalker.getTarget(makeTreeConfig(false, false, mockClosedBranchNodesFilter), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected);
				},
				testGetTargetTreeNextOverClosedBranchDepthFirst: function() {
					var start = document.getElementById("tree2"),
						expected = document.getElementById("tree4"),
						actual = keywalker.getTarget(makeTreeConfig(false, true, mockClosedBranchNodesFilter), start, keywalker.MOVE_TO.NEXT);
					assert.strictEqual(actual, expected);
				},
				testGetTargetTreePreviousOverClosedBranch: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree2"),
						actual = keywalker.getTarget(makeTreeConfig(false, false, mockClosedBranchNodesFilter), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected);
				},
				testGetTargetTreePreviousOverClosedBranchDepthFirst: function() {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree2"),
						actual = keywalker.getTarget(makeTreeConfig(false, true, mockClosedBranchNodesFilter), start, keywalker.MOVE_TO.PREVIOUS);
					assert.strictEqual(actual, expected);
				},
				testGetTargetChildNoChildren: function() {
					var start = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.CHILD);
					assert.isNull(actual, "CHILD without children should be null");
				},
				testGetTargetlastChildNoChildren: function() {
					var start = document.getElementById("tree1"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST_CHILD);
					assert.isNull(actual, "LAST_CHILD without children should be null");
				},
				testGetTargetParentTopLevel: function() {
					var start = document.getElementById("domKeyWalkerTree"),
						actual = keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PARENT);
					assert.isNull(actual, "PARENT from top should be null");
				},
				/* tests skipping disabled or hidden */
				testGetNextAcrossDisabled: function () {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree6"),
						disabled = document.getElementById("tree5"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testGetNextAcrossHidden: function () {
					var start = document.getElementById("tree4"),
						expected = document.getElementById("tree6"),
						hidden = document.getElementById("tree5"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.NEXT);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				testGetPreviousAcrossDisabled: function () {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree4"),
						disabled = document.getElementById("tree5"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testGetPreviousAcrossHidden: function () {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree4"),
						hidden = document.getElementById("tree5"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.PREVIOUS);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				testGetFirstWithDisabled: function () {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree2"),
						disabled = document.getElementById("tree1"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testGetFirstWithHidden: function () {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree2"),
						hidden = document.getElementById("tree1"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.FIRST);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				testGetLastWithDisabled: function () {
					var start = document.getElementById("tree2"),
						expected = document.getElementById("tree6"),
						disabled = document.getElementById("tree7"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testGetLastWithHidden: function () {
					var start = document.getElementById("tree2"),
						expected = document.getElementById("tree6"),
						hidden = document.getElementById("tree7"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(), start, keywalker.MOVE_TO.LAST);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				testPreviousInTreeFirstNodeWithCycleAndDisabled: function() {
					var start = document.getElementById("tree1"),
						expected = document.getElementById("tree6"),
						disabled = document.getElementById("tree7"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.PREVIOUS);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testPreviousInTreeFirstNodeWithCycleAndHidden: function() {
					var start = document.getElementById("tree1"),
						expected = document.getElementById("tree6"),
						hidden = document.getElementById("tree7"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.PREVIOUS);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				testNextInTreeLastNodeWithCycleAndDisabled: function() {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree1"),
						disabled = document.getElementById("tree7"),
						actual;
					try {
						disabled.setAttribute("aria-disabled", "true");
						actual= keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.NEXT);
						assert.strictEqual(actual, expected);
					}
					finally {
						disabled.removeAttribute("aria-disabled");
					}
				},
				testNextInTreeLastNodeWithCycleAndHidden: function() {
					var start = document.getElementById("tree6"),
						expected = document.getElementById("tree1"),
						hidden = document.getElementById("tree7"),
						actual;
					try {
						hidden.setAttribute("hidden", "hidden");
						actual= keywalker.getTarget(makeTreeConfig(true), start, keywalker.MOVE_TO.NEXT);
						assert.strictEqual(actual, expected);
					}
					finally {
						hidden.removeAttribute("hidden");
					}
				},
				/* tests which should result in nothing */
				testGetTargetTreeWithNoStart: function () {
					assert.isNull(keywalker.getTarget(makeTreeConfig(true), null, keywalker.MOVE_TO.NEXT));
				},
				testGetTargetTreeWithNoDirection: function () {
					assert.isNull(keywalker.getTarget(makeTreeConfig(true), document.getElementById("tree1"), null));
				},
			},
			'Test exceptions': {
				testGetTargetParentThrowsException: function() {
					var start = groupedElements[1];
					try {
						keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.PARENT);
						assert.fail(null, !null, "keywalker.MOVE_TO.PARENT should throw a ReferenceError");
					}
					catch (e) {
						assert.isTrue(true);
					}
				},
				testGetTargetChildThrowsException: function() {
					var start = groupedElements[1];
					try {
						keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.CHILD);
						assert.fail(null, !null, "keywalker.MOVE_TO.CHILD should throw a ReferenceError");
					}
					catch (e) {
						assert.isTrue(true);
					}
				},
				testGetTargetLastChildThrowsException: function() {
					var start = groupedElements[1];
					try {
						keywalker.getTarget(makeGroupConfig(), start, keywalker.MOVE_TO.LAST_CHILD);
						assert.fail(null, !null, "keywalker.MOVE_TO.LAST_CHILD should throw a ReferenceError");
					}
					catch (e) {
						assert.isTrue(true);
					}
				},
				testGetTargetTreeNonsenseDirectionThrowsError: function () {
					var start = document.getElementById("tree1");
					try {
						keywalker.getTarget(makeTreeConfig(), start, -1);
						assert.isTrue(false, "direction -1 should throw a ReferenceError");
					}
					catch (e) {
						assert.isTrue(true);
					}
				},
				testGetTargetNoConf: function () {
					try {
						keywalker.getTarget();
						assert.isTrue(false);
					}
					catch (ex) {
						assert.strictEqual(ex.constructor, TypeError, "Expected a TypeError");
					}
				},
				testGetTargetNoConfRoot: function () {
					try {
						keywalker.getTarget({});
						assert.isTrue(false);
					}
					catch (ex) {
						assert.strictEqual(ex.constructor, TypeError, "Expected a TypeError");
					}
				},
				testGetTargetRootNotElement: function () {
					var conf = {root: {nodeType: 8}};
					try {
						keywalker.getTarget(conf);
						assert.isTrue(false);
					}
					catch (ex) {
						assert.strictEqual(ex.constructor, TypeError, "Expected a TypeError");
					}
				}
			}
		}
	});
});