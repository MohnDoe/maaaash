angular.module("templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("bottom.html","<div class=\"container-user\">\r\n	<div class=\"container-image-user\">\r\n		<img ng-src=\"{{user.url_image}}\" class=\"image-user\"/>\r\n	</div>\r\n</div>\r\n<div class=\"container-level-progress\">\r\n	<div class=\"top-progress\">\r\n		<span class=\"name-level\">Level {{progress.level.current.number}}</span>\r\n		<span class=\"percent-progress\">{{progress.level.progress | number}}%</span>		\r\n	</div>\r\n	<div class=\"container-progress-bar\">\r\n		<div class=\"fill\" style=\"width : {{progress.level.progress}}%\"></div>\r\n	</div>\r\n	<span class=\"progression-level\">\r\n		<span class=\"current-points\">{{progress.points | number}}</span>\r\n		<span class=\"next-level-points\">/{{progress.level.next.points | number}} points</span>\r\n	</span>\r\n</div>\r\n<div class=\"container-button-bottom\">\r\n	<button id=\"button-bottom-bar\"\r\n        class=\"mdl-button mdl-js-button mdl-button--icon\">\r\n	  <i class=\"material-icons\">more_vert</i>\r\n	</button>\r\n</div>\r\n<ul class=\"mdl-menu mdl-menu--top-right mdl-js-menu mdl-js-ripple-effect\"\r\n    data-mdl-for=\"button-bottom-bar\">\r\n  <li disabled class=\"mdl-menu__item\">Sync channels</li>\r\n  <li class=\"mdl-menu__item\">Vote for the next features</li>\r\n  <li class=\"mdl-menu__item\" ng-click=\"logOut();\">Log Out</li>\r\n</ul>");
$templateCache.put("drawer.html","<span class=\"mdl-layout-title\">Maaaash</span>\r\n<ul class=\"mdl-list mdl-navigation\">\r\n  <li class=\"mdl-list__item mdl-navigation__link\" ng-class=\"{active: $state.current.activetab == \'battle\'}\" ng-click=\'$state.go(\"battle\");\'>\r\n    <span class=\"mdl-list__item-primary-content\"  >\r\n    <i class=\"material-icons mdl-list__item-icon\">whatshot</i>\r\n    Battle\r\n	</span>\r\n  </li>\r\n  <li class=\"mdl-list__item mdl-navigation__link\" ng-class=\"{active: $state.current.activetab == \'leaderboard\'}\" ng-click=\'$state.go(\"leaderboard\");\'>\r\n    <span class=\"mdl-list__item-primary-content\"  >\r\n    <i class=\"material-icons mdl-list__item-icon\">person</i>\r\n    Leaderboard\r\n	</span>\r\n  </li>\r\n  <li class=\"mdl-list__item mdl-navigation__link\" ng-class=\"{active: $state.current.activetab == \'top\'}\" ng-click=\'$state.go(\"top\");\'>\r\n    <span class=\"mdl-list__item-primary-content\"  >\r\n    <i class=\"material-icons mdl-list__item-icon\">movie</i>\r\n    Top channels\r\n	</span>\r\n  </li>\r\n</ul>");
$templateCache.put("header.html","<div class=\"mdl-layout__header-row\">\r\n    <!-- Title -->\r\n    <!-- <span class=\"mdl-layout-title\">Maaaash</span> -->\r\n    <!-- Add spacer, to align navigation to the right -->\r\n    <div class=\"mdl-layout-spacer\"></div>\r\n    <!-- Navigation -->\r\n    \r\n  </div>");
$templateCache.put("battle/index.html","<!-- Maaaash top -->\r\n<div id=\"container-ads-top-battle\" class=\"mdl-grid mdl-grid--no-spacing\">\r\n	<ins class=\"adsbygoogle ad-top-battle\r\n	mdl-cell\r\n	mdl-cell--hide-phone\r\n	mdl-cell--6-col\r\n	mdl-cell--3-offset\r\n\r\n	mdl-cell--6-col-tablet\r\n	mdl-cell--1-offset-tablet\"\r\n	     style=\"display:block\"\r\n	     data-ad-client=\"ca-pub-1584862178923141\"\r\n	     data-ad-slot=\"4458830718\"\r\n	     data-ad-format=\"link\"></ins>\r\n	\r\n</div>\r\n\r\n<button class=\"\r\nbutton-none\r\nmdl-button\r\nmdl-js-button\r\nmdl-button--colored\r\nmdl-js-ripple-effect\r\nmdl-button--raised\" ng-click=\"vote(\'none\')\">\r\nNeither\r\n</button>\r\n<div class=\"mdl-grid mdl-grid--no-spacing\" id=\"container-battle\">\r\n	<div class=\"container-side\r\n	mdl-cell\r\n	mdl-grid\r\n\r\n	mdl-grid--no-spacing\r\n\r\n	mdl-cell--6-col\r\n\r\n	mdl-cell--4-col-phone\r\n\r\n	mdl-cell--8-col-tablet\r\n\r\n	mdl-cell--stretch\">\r\n\r\n		<div \r\n		class=\"mdl-cell\r\n		mdl-cell--middle\r\n\r\n		mdl-cell--4-col\r\n		mdl-cell--4-offset\r\n\r\n		mdl-cell--2-col-phone\r\n		mdl-cell--1-offset-phone\r\n\r\n		mdl-cell--2-col-tablet\r\n		mdl-cell--3-offset-tablet\r\n\r\n		mdl-card\r\n		mdl-shadow--2dp\r\n\r\n		container-channel\"\r\n\r\n		ng-class=\"{\'mdl-shadow--4dp\' : hover1}\" \r\n	    ng-mouseenter=\"hover1 = true\"\r\n	    ng-mouseleave=\"hover1 = false\"\r\n	    ng-click=\"vote(1)\"\r\n		>\r\n	      <div class=\"mdl-card__title mdl-card--expand background-image-channel\" style=\"background-image:url(\'{{battle.channels[0].thumbnail_url}}\');\">\r\n	        <h2 class=\"mdl-card__title-text channel-name\">{{battle.channels[0].name}}</h2>\r\n	      </div>\r\n	    </div>\r\n	</div>\r\n\r\n\r\n	<div class=\"container-side\r\n	mdl-cell\r\n	mdl-grid\r\n\r\n	mdl-grid--no-spacing\r\n\r\n	mdl-cell--6-col\r\n\r\n	mdl-cell--4-col-phone\r\n\r\n	mdl-cell--8-col-tablet\r\n	\r\n	mdl-cell--stretch\">\r\n\r\n		<div \r\n		class=\"mdl-cell\r\n		mdl-cell--middle\r\n\r\n		mdl-cell--4-col\r\n		mdl-cell--4-offset\r\n\r\n		mdl-cell--2-col-phone\r\n		mdl-cell--1-offset-phone\r\n\r\n		mdl-cell--2-col-tablet\r\n		mdl-cell--3-offset-tablet\r\n\r\n		mdl-card\r\n		mdl-shadow--2dp		\r\n		\r\n		container-channel\"\r\n\r\n		ng-class=\"{\'mdl-shadow--4dp\' : hover2}\" \r\n	    ng-mouseenter=\"hover2 = true\"\r\n	    ng-mouseleave=\"hover2 = false\"\r\n	    ng-click=\"vote(2)\"\r\n		>\r\n	      <div class=\"mdl-card__title mdl-card--expand background-image-channel\" style=\"background-image:url(\'{{battle.channels[1].thumbnail_url}}\');\">\r\n	        <h2 class=\"mdl-card__title-text channel-name\">{{battle.channels[1].name}}</h2>\r\n	      </div>\r\n	    </div>\r\n	</div>\r\n</div>");
$templateCache.put("join/index.html","<div class=\"\r\nmdl-grid\r\n\" id=\"container-join\">\r\n	<div class=\"\r\n	container-introduction\r\n	mdl-cell\r\n	mdl-grid\r\n	mdl-grid--no-spacing\r\n	mdl-cell--middle\r\n\r\n	mdl-cell--4-col-desktop\r\n	mdl-cell--4-offset-desktop\r\n\r\n	mdl-cell--4-col-tablet\r\n	mdl-cell--2-offset-tablet\r\n\r\n	mdl-cell--4-col-phone\r\n	mdl-cell--0-offset-phone\">\r\n		<h1>Welcome to Maaaash</h1>\r\n		<h6>\r\n		Vote for the best channels you follow, one by one.\r\n		<br/>\r\n		Discover new channels.\r\n		<br/>\r\n		Get rewarded.\r\n		<br/><br/><br/>\r\n		<small>Log in with your main Youtube account, the one you use to follow channels.</small>\r\n		</h6>\r\n\r\n\r\n		<button class=\"\r\n		mdl-button\r\n		mdl-cell\r\n		mdl-js-button\r\n		mdl-button--raised\r\n		mdl-button--accent\r\n\r\n		mdl-cell--12-col\r\n		button-join\" \r\n\r\n		ng-click=\"Join.logWithYoutube()\"\r\n		>\r\n			Start voting now\r\n		</button>\r\n		\r\n	</div>\r\n</div>");
$templateCache.put("leaderboard/index.html","<div id=\"container-leaderboard\" class=\"mdl-grid mdl-grid--no-spacing\">\r\n	<div class=\"container-header mdl-cell mdl-cell--12-col mdl-shadow--2dp\">\r\n		<h2 class=\"big-title\">Leaderboard</h2>\r\n		<h6 class=\"subtitle\">{{leaderboard.name}}</h6>\r\n	</div>\r\n	<ul class=\"\r\n	mdl-list\r\n	mdl-cell\r\n	mdl-cell--4-col-desktop\r\n	mdl-cell--4-offset-desktop\r\n\r\n	mdl-cell--6-col-tablet\r\n	mdl-cell--1-offset-tablet\r\n\r\n	mdl-cell--4-col-phone\r\n	mdl-cell--stretch\r\n	list-leaderboard\r\n	mdl-shadow--4dp\r\n	\">\r\n		<div class=\"mdl-spinner mdl-js-spinner is-active leaderboard-spinner\" ng-show=\"loading\"></div>\r\n		<li class=\"mdl-list__item mdl-list__item--two-line user-leaderboard\" ng-repeat=\'u in leaderboard.users\' ng-show = \"!loading\">\r\n			<span class=\"mdl-list__item-primary-content\">\r\n				<div class=\"\r\n					mdl-list__item-avatar\r\n					mdl-badge\r\n					mdl-badge--overlap\r\n					user-avatar\"\r\n					data-badge=\"{{$index+1}}\"\"\r\n					style=\"background-image:url(\'{{u.url_image}}\');\"></div>\r\n				<span class=\"user-name\">{{u.display_name}}</span>\r\n				<span class=\"mdl-list__item-sub-title user-earning\">+{{u.points | number}} points</span>\r\n			</span>\r\n		</li>\r\n	</ul>\r\n</div>");
$templateCache.put("sync/index.html","<div class=\"\r\nmdl-grid\r\n\" id=\"container-sync\">\r\n	<div class=\"\r\n	container-text-sync\r\n	mdl-cell\r\n	mdl-grid\r\n	mdl-grid--no-spacing\r\n	mdl-cell--middle\r\n\r\n	mdl-cell--4-col-desktop\r\n	mdl-cell--4-offset-desktop\r\n\r\n	mdl-cell--4-col-tablet\r\n	mdl-cell--2-offset-tablet\r\n\r\n	mdl-cell--4-col-phone\r\n	mdl-cell--0-offset-phone\">\r\n		<h2>Collecting YouTube subscriptions.</h2>\r\n		<div class=\"mdl-spinner mdl-js-spinner is-active sync-channels-spinner\"></div>\r\n		<h6>Please be patient, this can take a few seconds.<br/>\r\n		<small>You\'ll be automaticly redirected when it\'s done.</small> \r\n		</h6>\r\n	</div>\r\n</div>");
$templateCache.put("top/index.html","<div id=\"container-top-channels\" class=\"mdl-grid mdl-grid--no-spacing\">\r\n	<div class=\"container-header mdl-cell mdl-cell--12-col mdl-shadow--2dp\">\r\n		<h2 class=\"big-title\">Top 10</h2>\r\n		<h6 class=\"subtitle\">Channels</h6>\r\n	</div>\r\n	<ul class=\"\r\n	list-top-channels\r\n	\r\n	mdl-cell\r\n	mdl-cell--10-col-desktop\r\n	mdl-cell--1-offset-desktop\r\n\r\n	mdl-cell--6-col-tablet\r\n	mdl-cell--1-offset-tablet\r\n\r\n	mdl-cell--4-col-phone\r\n	mdl-cell--0-offset-phone\r\n	mdl-cell--stretch\r\n\r\n	mdl-grid\r\n	\">\r\n		<div class=\"mdl-spinner mdl-js-spinner is-active top-channels-spinner\" ng-show=\"loading\"></div>\r\n		<li \r\n		class=\"\r\n		container-channel\r\n		mdl-cell\r\n		mdl-card\r\n		mdl-shadow--4dp\r\n		\"\r\n\r\n		ng-repeat=\'c in channels\'\r\n		ng-show = \"!loading\"\r\n		\r\n		ng-class= \"{\r\n		\'mdl-cell--4-col-phone mdl-cell--8-col-tablet mdl-cell--6-col-desktop\' : $index <= 1,\r\n		\'mdl-cell--2-col-phone mdl-cell--4-col-tablet mdl-cell--3-col-desktop\' : $index > 1\r\n		}\"\r\n		>\r\n	      <div class=\"mdl-card__title mdl-card--expand background-image-channel\" style=\"background-image:url(\'{{c.thumbnail_url}}\');\">\r\n	        <h2 class=\"mdl-card__title-text channel-name\">{{c.name}}</h2>\r\n	      </div>\r\n	    </li>\r\n	</ul>\r\n</div>");}]);