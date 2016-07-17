angular.module("templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("battle/index.html","<div class=\"row medium-unstack align-stretch\" id=\"container-battle\">\r\n	<div class=\"small-12 columns container-side\" ng-click=\"vote(1)\">\r\n		<div class=\"row align-center align-middle container-channel\">\r\n			<div class=\"small-5 medium-8 large-5 container-infos\">\r\n\r\n				<div class=\"container-informations align-center align-middle\">\r\n					<span class=\"channel-sub-count\">\r\n						<span class=\"count\">{{battle.channels[0].subscriber_count | megaNumber}}</span>\r\n						<br/>\r\n						<span class=\"small\">Subscribers</span> \r\n					</span>\r\n					<div class=\"container-name-channel\">\r\n						<span class=\"channel-name\">{{battle.channels[0].name}}</span>\r\n					</div>\r\n					<span class=\"channel-view-count\">\r\n						<span class=\"count\">{{battle.channels[0].view_count | megaNumber}}</span>\r\n						<br/>\r\n						<span class=\"small\">Views</span> \r\n					</span>\r\n				</div>\r\n\r\n				<div class=\"container-gradient\"></div>\r\n\r\n				<div class=\"container-image-channel\">\r\n					<img ng-src=\"{{battle.channels[0].thumbnail_url}}\" class=\"channel-image\">\r\n				</div>\r\n				\r\n			</div>\r\n		</div>\r\n	</div>\r\n	<div class=\"small-12 columns container-side\" ng-click=\"vote(2)\">\r\n		<div class=\"row align-center align-middle container-channel\">\r\n			<div class=\"small-5 medium-8 large-5 container-infos\">\r\n\r\n				<div class=\"container-informations align-center align-middle\">\r\n					<span class=\"channel-sub-count\">\r\n						<span class=\"count\">{{battle.channels[1].subscriber_count | megaNumber}}</span>\r\n						<br/>\r\n						<span class=\"small\">Subscribers</span> \r\n					</span>\r\n					<div class=\"container-name-channel\">\r\n						<span class=\"channel-name\">{{battle.channels[1].name}}</span>\r\n					</div>\r\n					<span class=\"channel-view-count\">\r\n						<span class=\"count\">{{battle.channels[1].view_count | megaNumber}}</span>\r\n						<br/>\r\n						<span class=\"small\">Views</span> \r\n					</span>\r\n				</div>\r\n\r\n				<div class=\"container-gradient\"></div>\r\n\r\n				<div class=\"container-image-channel\">\r\n					<img ng-src=\"{{battle.channels[1].thumbnail_url}}\" class=\"channel-image\">\r\n				</div>\r\n				\r\n			</div>\r\n		</div>\r\n	</div>\r\n</div>\r\n<div ng-include=\"\'bottom/index.html\'\"></div>");
$templateCache.put("join/index.html","<div class=\"row align-middle align-center\" id=\"container-join\">\r\n	<div class=\"small-10 large-5 columbs\">\r\n		<a href=\"/\">CANCER</a>\r\n		<a class=\"button youtube expanded\" ng-click=\"Join.logWithYoutube()\">Sign Up with Youtube</a>\r\n	</div>\r\n</div>");
$templateCache.put("sync/index.html","<h1>ON CHARGE TES CHAINES RESTES TRANQUILLE STP</h1>");
$templateCache.put("bottom/index.html","<div id=\"container-bottom\" ng-controller=\"bottomUserCtrl as bottomUser\">\r\n	<div class=\"container-user\">\r\n		<div class=\"container-image-user\">\r\n			<img ng-src=\"{{user.url_image}}\" class=\"image-user\"/>\r\n		</div>\r\n	</div>\r\n	<div class=\"container-level-progress\">\r\n		<div class=\"top-progress\">\r\n			<span class=\"name-level\">Level 1</span>\r\n			<span class=\"percent-progress\">78%</span>		\r\n		</div>\r\n		<div class=\"container-progress-bar\">\r\n			<div class=\"fill\"></div>\r\n		</div>\r\n		<span class=\"progression-level\">\r\n			<span class=\"current-points\">{{user.points | number}}</span>\r\n			<span class=\"next-level-points\">/{{1324 | number}} points</span>\r\n		</span>\r\n	</div>\r\n</div>");}]);