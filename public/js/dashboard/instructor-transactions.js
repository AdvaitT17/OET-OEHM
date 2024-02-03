

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	 
	var screenWidth = $(window).width();
		var chartBar = function(){
		var options = {
			  series: [
				{
					name: '',
					data: [120, 40, 30,80,90, 60],
					//radius: 12,	
				}, 
				{
				  name: '',
				  data: [40, 50, 60,50,40, 70]
				}, 
				
			],
				chart: {
				type: 'bar',
				height: 350,
				
				toolbar: {
					show: false,
				},
				
			},
			plotOptions: {
			  bar: {
				horizontal: false,
				columnWidth: '60%',
				endingShape: "rounded",
				borderRadius: 5,
			  },
			  
			},
			states: {
			  hover: {
				filter: 'none',
			  }
			},
			colors:['#4CBC9A', '#FEC64F'],
			dataLabels: {
			  enabled: false,
			},
			// markers: {
		// shape: "circle",
		// },
		
		
			legend: {
				show: false,
				fontSize: '12px',
				labels: {
					colors: '#000000',
					
					},
				markers: {
				width: 18,
				height: 18,
				strokeWidth: 10,
				strokeColor: '#fff',
				fillColors: undefined,
				radius: 12,	
				}
			},
			stroke: {
			  show: true,
			  width: 4,
			  curve: 'smooth',
			  lineCap: 'round',
			  colors: ['transparent']
			},
			grid: {
				borderColor: '#DBDBDB',
				strokeDashArray: 10,
			},
			xaxis: {
				categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May','Jun','Jul','Aug','Sep','Oct','Nov','Dec',],
				labels: {
					show: true,
					style: {
						colors: '#A5AAB4',
						fontSize: '14px',
						fontWeight: '500',
						fontFamily: 'poppins',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
				crosshairs: {
					show: false,
				},
				axisBorder: {
					show: false,
				},
				axisTicks: {
					show: false,
				}, 			
			},
			yaxis: {
				labels: {
				show: true,
					offsetX:-16,
				   style: {
					  colors: '#000000',
					  fontSize: '13px',
					   fontFamily: 'poppins',
					  fontWeight: 100,
					  cssClass: 'apexcharts-xaxis-label',
				  },
			  },
			},
			fill: {
				type: 'gradient',
				gradient: {
					shade: 'white',
					type: "vertical",
					shadeIntensity: 0.2,
					gradientToColors: undefined, // optional, if not defined - uses the shades of same color in series
					inverseColors: true,
					opacityFrom: 1,
					opacityTo: 1,
					stops: [0, 50, 50],
					colorStops: []
				}
			}, 
			tooltip: {
			  y: {
				formatter: function (val) {
				  return "$ " + val
				}
			  }
			},
			};

			var chartBar1 = new ApexCharts(document.querySelector("#chartBar"), options);
			chartBar1.render();
	}
	
	 var emailchart = function() {
		var options = {
			series: [27, 23, 50, 40 ],
			chart: {
				type: 'donut',
				height: 250
			},
			plotOptions: {
			  donut: {
				borderRadius: 5,
			  },
			  
			},
			dataLabels: {
				enabled: false
			},
			stroke: {
				width: 0,
				curve: 'smooth',
				lineCap: 'round',
			},
			colors: ['var(--primary)', '#4CBC9A', '#FEC64F','#DBDBDB'],
			legend: {
				position: 'bottom',
				show: false
			},
			responsive: [{
				breakpoint: 1800,
				options: {
					chart: {
						height: 200
					},
				}
			}, {
				breakpoint: 1800,
				options: {
					chart: {
						height: 200
					},
				}
			}]
		};
		var chart = new ApexCharts(document.querySelector("#emailchart"), options);
		chart.render();
	}
	
	
		
		
				
		
		
       
		
	
	
	 
	
 
	/* Function ============ */
	return {
		init:function(){
		},
		
		
		load:function(){
			chartBar();
			emailchart();
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