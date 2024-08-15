using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
	private readonly ServerKeyStore _serverKeyStore;

	public HomeController(ILogger<HomeController> logger, ServerKeyStore serverKeyStore)
    {
        _logger = logger;
        _serverKeyStore = serverKeyStore;

	}

    public IActionResult Index()
    {
		ViewData["PublicKey"] = _serverKeyStore.GetPublicKey();
		return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}