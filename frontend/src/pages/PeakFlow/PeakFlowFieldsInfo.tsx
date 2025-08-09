const stormRunoffInfo = () => {
  return (
    <div>
      <h2 className="font-semibold">Storm Runoff (from ERMiT run)</h2>
      <p className="mb-2">
        From the information given in the ERMiT Rainfall Event Rankings and Characteristics From Selected Storms table, it is possible to determine a number of attributes about the nature of the runoff. This example is from an ERMiT run for a severe wildfire using a hillside in a watershed in the Mica Creek Experimental Forest in Northern Idaho. The largest predicted storm runoff event from 100 years of stochastic climate on a severely burned hillslope was 88 mm from only 10.1 mm of precipitation on March 1 in year 97. As the runoff is greater than the precipitation, and it occurred in March, the user can assume that this was a rain-on-snow event, and a melting snowpack contributed more water to the runoff than was in the rainfall.
      </p>
      <p className="mb-2">
        If it is likely that the runoff event of concern occurred during a time when the soil was likely saturated, as it is during most rain-on-snow or snow-melt events, the user may want to increase the runoff amount to account for lateral flow. This can be estimated from the WEPP Windows water file for a run for the same climate and hillslope, with specifying a soil and cover to match the fire severity condition, and noting the lateral flow on the date of concern.
      </p>
      <p className="mb-2">
        Another approach is simply to increase the runoff amount by about 20 percent, a typical average value in a burned watershed.
      </p>
      <img src="/ERMiTexampleRun.png" alt="ERMiT example run" />
    </div>
  );
}

export default stormRunoffInfo;