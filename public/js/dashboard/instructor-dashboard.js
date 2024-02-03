

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	
	var screenWidth = $(window).width();
	
	
	
	
	var chartBar = function(){
		
		var options = {
			  series: [
				{
					name: 'Running',
					data: [50, 60, 90],
					//radius: 12,	
				}, 
				{
				  name: 'Cycling',
				  data: [80, 40, 55]
				}, 
				
			],
				chart: {
				type: 'bar',
				height: 150,
				
				toolbar: {
					show: false,
				},
				
			},
			plotOptions: {
			  bar: {
				horizontal: false,
				columnWidth: '80%',
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
			markers: {
		shape: "circle",
		},
		
		
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
				borderColor: '#fff',
			},
			xaxis: {
				categories: ['JAN', 'FEB', 'MAR', 'APR', 'MAY'],
				labels: {
					show: false,
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
				show: false,
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
				  return "$ " + val + " thousands"
				}
			  }
			},
			};

			var chartBar1 = new ApexCharts(document.querySelector("#chartBar"), options);
			chartBar1.render();
	}
	
	var peityLine = function(){
		$(".peity-line").peity("line", {
			fill: ["rgba(254, 198, 79, 0.15)"], 
			stroke: '#FEC64F', 
			strokeWidth: '4', 
			width: "100%",
			radius: 8,
			height: "104"
		});
	}
	var earningtBar = function() {
		var options = {
			  series: [{
			  name: "STOCK ABC",
			  data: [20, 40, 20, 80, 40, 40]
			}],
			  chart: {
			  type: 'area',
			  height: 150,
			  offsetX:-5,
			  parentHeightOffset: 0,
			  toolbar: {
					show: false
				},
			  zoom: {
				enabled: false
			  }
			},
			dataLabels: {
                    enabled: false
			},
			stroke: {
				width: [3],
				colors: ['#4CBC9A'],
				curve: 'straight'
			},
			markers: {
				size: [4],
				strokeWidth: [3],
				strokeColors: ['#4CBC9A'],
				border: 0,
				colors: ['#fff'],
				hover: {
					size: 6,
				}
			},
			
			xaxis: {
				labels: {
					show:false,
				},
				axisBorder: {
					show:false,
				},
				axisTicks: {
					show:false,
				},
			},
			yaxis: {
			  labels: {
					show:false,
			  }
			},
			legend: {
			  horizontalAlign: 'left'
			},
			fill: {
				colors: ['#4CBC9A'],
				type: 'solid',
				opacity: 0.1
			},
			colors: ['#4CBC9A'],
			 grid: {
				show: false,
			},
			
			};

		var chart = new ApexCharts(document.querySelector("#earningtBar"), options);
		chart.render();
		
        }
		
		var columnChart = function(){
		var options = {
			series: [{
				name: 'Aplication Sent',
				data: [40, 55, 15, 50, 70, 20, 55,35, 15,]
			}, {
				name: 'Appllication Answered',
				data: [55, 55, 35, 15,  35, 55, 20,40, 55,]
			}, {
				name: 'Hired',
				data: [20, 17, 55, 45, 30, 65, 50,20, 55,]
			}],
			chart: {
				type: 'bar',
				height: 350,
				stacked: true,
				toolbar: {
					show: false,
				}
			},
			
			plotOptions: {
				bar: {
					horizontal: false,
					columnWidth: '40%',
					
					endingShape: "rounded",
					startingShape: "rounded",
					backgroundRadius: 10,
					colors: {
						backgroundBarColor: '#fff',
						backgroundBarOpacity: 1,
						backgroundBarRadius: 10,
					},
				},
				
			},
			stroke:{
				width:8,
				colors:["#fff"]
			},
			colors:['#FEC64F', 'var(--secondary)', '#DBDBDB'],
			xaxis: {
				show: true,
				axisBorder: {
					show: false,
				},
				
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
				crosshairs: {
					show: false,
				},
				
				categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul','Aug','Sep','Oct','Nov','Dec'],
			},
			yaxis: {
				show: true,
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
			},
			grid: {
				show: true,
				borderColor: '#DBDBDB',
				strokeDashArray: 10,
				position: 'back',
				xaxis: {
					lines: {
						show: false
					}
				},   
				yaxis: {
					lines: {
						show: true
					}
				},  
			},
			toolbar: {
				enabled: false,
			},
			dataLabels: {
			  enabled: false
			},
			legend: {
				show:false
			},
			fill: {
				opacity: 1
			},
			responsive: [{
				breakpoint: 1601,
				options: {
					plotOptions: {
						bar: {
							columnWidth: '60%',
						},
						
					},
				},
			}]
		};

		var chart = new ApexCharts(document.querySelector("#columnChart"), options);
		chart.render();
	}
	
	
 
	/* Function ============ */
		return {
			init:function(){
			},
			
			
			load:function(){
				chartBar();
				peityLine();
				earningtBar();
				columnChart();
				
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