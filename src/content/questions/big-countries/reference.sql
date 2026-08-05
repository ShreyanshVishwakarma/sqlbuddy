-- Reference: big by area or population, thresholds inclusive.
SELECT name, population, area
FROM world
WHERE area >= 3000000 OR population >= 25000000
ORDER BY name;
