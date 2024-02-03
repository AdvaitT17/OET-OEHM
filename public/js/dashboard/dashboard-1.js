

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	
	var screenWidth = $(window).width();
	let draw = Chart.controllers.line.__super__.draw; //draw shadow
	
	var chartBar = function(){
		var options = {
			  series: [
				{
					name: '',
					data: [120, 90, 70, 40,50, 18, 70, 90,70, 40,50, 18],
					//radius: 12,	
				}, 
				{
				  name: '',
				  data: [75,50, 18, 70, 40,70, 100,50, 18, 40, 55, 100]
				}, 
				
			],
			chart: {
				type: 'bar',
				height: 285,
				
				toolbar: {
					show: false,
				},
				
			},
			plotOptions: {
			  bar: {
				horizontal: false,
				columnWidth: '35%',
				endingShape: "rounded",
				borderRadius: 2,
			  },
			  
			},
			states: {
			  hover: {
				filter: 'none',
			  }
			},
			colors:['var(--primary)', 'var(--secondary)'],
			dataLabels: {
			  enabled: false,
			},
			markers: {
				shape: "circle",
			},
		
		
			legend: {
				show: false,
				fontSize: '14px',
				position: 'top',
				labels: {
					colors: '#000000',
					
					},
				markers: {
				width: 18,
				height: 18,
				strokeWidth:50,
				strokeColor: '#fff',
				fillColors: undefined,
				radius: 12,	
				}
			},
			stroke: {
			  show: true,
			  width:3,
			  curve: 'smooth',
			  lineCap: 'round',
			  colors: ['transparent']
			},
			grid: {
				borderColor: '#eee',
			},
			xaxis: {
				position: 'bottom',
				  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
				  labels: {
				   show: true,
				   style: {
					  colors: '#999999',
					  fontSize: '14px',
					  fontFamily: 'poppins',
					  fontWeight: 400,
					  cssClass: 'apexcharts-xaxis-label',
					},
				  },
				   axisBorder:{
					 show: false,  
					   
					 },
				  crosshairs: {
				  show: false,
			  }
			},
			yaxis: {
				labels: {
					offsetX:-16,
				   style: {
					  colors: '#787878',
					  fontSize: '13px',
					   fontFamily: 'poppins',
					  fontWeight: 100,
					  cssClass: 'apexcharts-xaxis-label',
				  },
			  },
			},
			fill: {
			  opacity: 1,
			  colors:['var(--secondary)', 'var(--primary)'],
			},
			tooltip: {
			  y: {
				formatter: function (val) {
				  return " " + val + ""
				}
			  }
			},
		};

		var chartBar1 = new ApexCharts(document.querySelector("#chartBar"), options);
		chartBar1.render();
	}
	var activity = function(){
		var optionsArea = {
          series: [{
            name: "",
            data: [60, 70, 80, 50, 60, 50, 90]
          },
		  {
            name: "",
            data: [40, 50, 40, 60, 90, 70, 90]
          }
        ],
          chart: {
          height: 300,
          type: 'area',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [3, 3, 3],
		  colors:['var(--secondary)','var(--primary)'],
		  curve: 'straight'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['var(--secondary)','var(--primary)'],
			width: 16,
			height: 16,
			strokeWidth: 0,
			radius: 16
		  }
        },
        markers: {
          size: [8,8],
		  strokeWidth: [4,4],
		  strokeColors: ['#fff','#fff'],
		  border:2,
		  radius: 2,
		  colors:['var(--secondary)','var(--primary)','#fff'],
          hover: {
            size: 10,
          }
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		  labels: {
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		  axisBorder:{
			  show: false,
		  }
        },
		yaxis: {
			labels: {
				minWidth: 20,
				offsetX:-16,
				style: {
				  colors: '#3E4954',
				  fontSize: '14px',
				   fontFamily: 'Poppins',
				  fontWeight: 100,
				  
				},
			},
		},
		fill: {
			colors:['#fff','#FF9432'],
			type:'gradient',
			opacity: 1,
			gradient: {
				shade:'light',
				shadeIntensity: 1,
				colorStops: [ 
				  [
					{
					  offset: 0,
					  color: '#fff',
					  opacity: 0
					},
					{
					  offset: 0.6,
					  color: '#fff',
					  opacity: 0
					},
					{
					  offset: 100,
					  color: '#fff',
					  opacity: 0
					}
				  ],
				  [
					{
					  offset: 0,
					  color: 'var(--primary)',
					  opacity: .4
					},
					{
					  offset: 50,
					  color: 'var(--primary)',
					  opacity: 0.25
					},
					{
					  offset: 100,
					  color: '#fff',
					  opacity: 0
					}
				  ]
				]

		  },
		},
		colors:['#1EA7C5','#FF9432'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          },
		  yaxis: {
            lines: {
              show: false
            }
          },
        },
		 responsive: [{
			breakpoint: 1602,
			options: {
				markers: {
					 size: [6,6,4],
					 hover: {
						size: 7,
					  }
				},chart: {
				height: 230,
			},	
			},
			
		 }]
        };
		var chartArea = new ApexCharts(document.querySelector("#activity"), optionsArea);
        chartArea.render();

	}

	var redial = function() {
		var options = {
			series: [75],
			chart: {
				height: 200,
				type: 'radialBar',
			},
			colors:["var(--primary)"],
			plotOptions: {
				radialBar: {
					startAngle: -180,
					endAngle: 120,
                    hollow: {
                        size: '65%',
						background: 'var(--rgba-primary-1)',
						margin:20
                    },
					dataLabels: {
                      show: true,
                      name: {
                        offsetY: 20,
                        show: true,
                        color: '#888',
                        fontSize: '14px'
                      },
                      value: {
                        formatter: function(val) {
                          return val + "%"
                        },
                        offsetY: -10,
                        color: '#000000',
                        fontWeight:700,
                        fontSize: '24px',
                        show: true,
                      }
                    },
					track: {
						background: '#FFF',
					}
				}
			},
            stroke: {
              lineCap: 'round'
            },
			labels: [''],
			responsive: [{
				breakpoint: 575,
				options: {
					chart: {
						height: 280,
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
				chartBar();
				activity();
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