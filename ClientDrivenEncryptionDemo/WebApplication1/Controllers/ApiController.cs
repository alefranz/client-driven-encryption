using Microsoft.AspNetCore.Mvc;

namespace WebApplication1.Controllers;

[ApiController]
public class ApiController
{
    [HttpGet("/api")]
    public MyResponseDto Get()
    {
        return new MyResponseDto
        {
            SomeNormalProperty = "foo",
            SomeSensitiveProperty = "bar"
        };
    }
}