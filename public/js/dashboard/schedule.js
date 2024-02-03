

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	
	var screenWidth = $(window).width();
	 var redial = function() {
		var options = {
			series: [70],
			chart: {
				type: 'radialBar',
				offsetY: 0,
				height: 300,
				sparkline: {
					enabled: true
				}
			},
			plotOptions: {
				radialBar: {
					startAngle: -90,
					endAngle: 90,
					track: {
						background: "#DBDBDB",
						strokeWidth: '100%',
						margin: 3,
					},
					hollow: {
						margin: 50,
						size: '70%',
						background: 'white',
						position: 'front',
					},
					dataLabels: {
						name: {
							show: false
						},
						value: {
							offsetY: -20,
							fontSize: '36px',
							color: '#374557',
							fontWeight: 600,
						}
					}
				}
			},
			grid: {
				padding: {
					top: -10
				}
			},
			fill: {
				type: 'gradient',
				colors: '#FEC64F',
				gradient: {
					shade: 'white',
					shadeIntensity: 0.15,
					inverseColors: false,
					opacityFrom: 1,
					opacityTo: 1,
					stops: [0, 50, 65, 91]
				},
			},
			labels: ['Average Results'],
			responsive: [{
				breakpoint: 1750,
				options: {
					chart: {
						height: 250
					},
				}
			}],
		};
		var chart = new ApexCharts(document.querySelector("#redial"), options);
		chart.render();
	}
	
	
	
 
	/* Function ============ */
		return {
			init:function(){
			},
			
			
			load:function(){
				redial();
				
			},
			
			resize:function(){
			}
		}
	
	}();

	
		
	jQuery(window).on('load',function(){
		setTimeout(function(){
			dlabChartlist.load();
		}, 1000); 
		
	});

     

})(jQuery);