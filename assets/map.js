var PageLayout = React.createClass({
    render: function(){
        return(
            <div>
                <MenuExample items={ ['Home', 'Services', 'About', 'Contact us'] } title={'output '} />
                <HomePanel />
                <SettingsPanel />
            </div>
            );
    }
});

var HomePanel = React.createClass({
    render: function(){
        return(
                <div role="tabpanel" className="tab-pane active" id="home">
                    <div className="row">
                      <div className="col-md-8 col-md-offset-2 text-center">
                        <h2>Home panel</h2>
                        <p>This is a home panel for the modelling the eliminiation of Lymphatic Filariasis. Below gives a current overview of the national MDA coverage for countries at risk of LF. The settings tab changes various aspects related to the MDA programme, vector control and baseline prevalence.</p>
                         <p>The run tab simulates
                          forward for twenty years based on current settings. The number of MDA rounds required can also be computed.</p>
                      </div>
                    </div>
                    <div className="row">


                            <WorldMap/>


                    </div>

                </div>

            );
    }
});

var WorldMap = React.createClass({
    render: function(){
        return(
                <div id="map-form">
                    <div className="col-md-4 col-md-offset-2">
                        <div id="world_map">
                          <h1 className="text-center" style={{display:'none'}}></h1>
                          <div className="form-group">
                            <label for="selectCountry">Select country</label>
                            <select className="form-control" id="selectCountry"></select>
                          </div>
                        </div>
                    </div>
                    <div className="col-md-4" id="mda-table-box">
                    <MenuExample items={ ['mf prevalence', 'bed-net coverage','population size'] } title={'Map display '} />
                    <h4 className="text-center">National Programme Status</h4>
                    <table className="table table-striped">
                        <tbody>
                          <tr>
                              <td>Country</td>
                              <td>MDA type</td>
                              <td>MDA National Coverage</td>
                          </tr>

                          <tr>

                            <td id="country-name-form"></td>
                            <td id="mda-form"></td>
                            <td id="coverage-form"></td>
                          </tr>
                        </tbody>
                    </table>
                    <div className="btn-group">
                      <button className="btn btn-default" id="set-mda-regimen" >Set as MDA parameters</button>
                    </div>


                  </div>
                  <div className="col-md-4" style={{display: 'none'}}>
                    <img src="./../assets/img/Tanzania_example_2.png" className="img-responsive" alt="Responsive image"/>
                    &nbsp;
                    <button type="button" className="btn btn-danger">High</button>
                    <button type="button" className="btn btn-warning">Medium</button>
                    <button type="button" className="btn btn-primary">Low</button>
                  </div>
                </div>
            )
    }
});

var MenuExample = React.createClass({

    getInitialState: function(){
        return { focused: 0 };
    },

    selected: function(index){

        // The click handler will update the state with
        // the index of the focused menu entry

        this.setState({focused: index});

        console.log('selected item : ' + this.props.items[index]);

    },

    render: function() {

        // Here we will read the items property, which was passed
        // as an attribute when the component was created

        var self = this;

        // The map method will loop over the array of menu entries,
        // and will return a new array with <li> elements.

        return (
            <div>


                <div className = "form-group">
                      <label for="selectCountry">{this.props.title}</label>
                        <select className="form-control" id="selectCountry">

                    { this.props.items.map(function(m, index){

                        var style = '';

                        if(self.state.focused == index){
                            style = 'focused';
                        }

                        // Notice the use of the bind() method. It makes the
                        // index available to the clicked function:

                        return <option className={style} onSelect={self.selected.bind(self, index)}>{m}</option>;

                    }) }

                    </select>


                </div>
                <p>Selected: {this.props.items[this.state.focused]}</p>
            </div>
        );

    }
});

var VectorSettingPanel = React.createClass({
  render: function(){
    return(
      <div className="panel panel-default">
        <div className="panel-heading" role="tab" id="headingOne">
          <h4 className="panel-title">
            <a className="collapsed" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
              Vector Species
            </a>
          </h4>
        </div>
        <div id="collapseOne" className="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">
        <div className="panel-body">

        <div className="radio">
          <label className="text-center">

            <input type="radio" name="speciesRadios" id="optionsRadios1" value="0" defaultChecked />
            Anopheles
          </label>
        </div>
        <div className="radio">
          <label className="text-center">

            <input type="radio" name="speciesRadios" id="optionsRadios2" value="1" />
            Culex
          </label>
        </div>

          </div>
        </div>
      </div>
    );
  }
});

var SettingsPanel = React.createClass({
  render: function(){
    return(
      <div role="tabpanel" className="tab-pane" id="setting">
          <div className="col-md-6 col-md-offset-3">
            <h2 className="text-center">Setting panel</h2>
            <div className="panel-group" id="accordion2" role="tablist" aria-multiselectable="true">
              <div className="panel panel-default">
                <div className="panel-heading" role="tab" id="headingOne2">
                  <h4 className="panel-title">
                    <a className="collapsed" data-toggle="collapse" data-parent="#accordion2" href="#collapseOne2" aria-expanded="true" aria-controls="collapseOne">
                      Baseline prevalence
                    </a>
                  </h4>
                </div>
                <div id="collapseOne2" className="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne2">
                  <div className="panel-body">
                    <div className="form-horizontal">
                      <div className="form-group">
                        <label for="endemicity" className="col-sm-2">Microfilaraemia prevalence</label>
                        <div className="col-sm-10">
                          <input id="endemicity" data-slider-id='endemicitySlider' type="text" data-slider-min="9.0" data-slider-max="18.0" data-slider-step="0.5" data-slider-value="10"/>
                        </div>
                      </div>
                    </div>
                    <p>The mf prevalence in the population before intervention occurs. Due to the stochastic nature of the model this is a prevalence averaged over many independent runs and so should be treated as an approximation only.</p>

                  </div>
                </div>
                <VectorSettingPanel />
              </div>
            </div>


          </div>
      </div>
    );
  }
});

// Render the menu component on the page, and pass an array with menu options

ReactDOM.render(
    <PageLayout />
    ,
    document.getElementById('app')
);
