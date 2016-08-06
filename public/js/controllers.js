angular.module('app.controllers', [])
  
.controller('uploadPokemonLocationsCtrl', function($scope, $cordovaGeolocation, $http) {
	
	$scope.currentLocationLat = "";
	$scope.currentLocationLong = "";
	$scope.mapUrl = "";
	$scope.model = {};
	$scope.model.pokeName = "";
	
	$scope.getLocation = function() {
		
		  var posOptions = {timeout: 10000, enableHighAccuracy: false};
		  $cordovaGeolocation
			.getCurrentPosition(posOptions)
			.then(function (position) {
			  $scope.currentLocationLat  = position.coords.latitude
			  $scope.currentLocationLong = position.coords.longitude
			  $scope.plotLocation()
			}, function(err) {
			  // error
			});
		
	};
	
	$scope.sendToServer = function() {
		
		
		$http.get("http://rumble-caffevino.rhcloud.com/api/" + "pokemapSubmit/" + $scope.model.pokeName + "/" + $scope.currentLocationLat + "/" + $scope.currentLocationLong)
		.then(function(data)
		{
			console.log(data);
        });
		
	};
	
	$scope.plotLocation = function() {
        
        var mapUrl = "http://maps.google.com/maps/api/staticmap?markers=color:red|";
        mapUrl = mapUrl + $scope.currentLocationLat + ',' + $scope.currentLocationLong;
        mapUrl = mapUrl + '&zoom=15&size=512x512&maptype=roadmap&sensor=false';
        $scope.mapUrl = mapUrl;
      }
})
   
.controller('getPokemonLocationsCtrl', function($scope) {

})
    